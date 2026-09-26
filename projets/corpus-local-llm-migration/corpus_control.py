#!/usr/bin/env python3
"""Corpus control plane: constitution, map, doctor, drift, coverage and safe GC preview."""
from __future__ import annotations

import argparse
import importlib.metadata as metadata
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

import corpus_paths

HERE = Path(__file__).resolve().parent
POLICY_PATH = HERE / "CORPUS_LIFECYCLE.json"


def load_policy(path=POLICY_PATH):
    data = json.loads(Path(path).read_text())
    if data.get("schema_version") != 1:
        raise RuntimeError("Version de constitution Corpus non supportée.")
    return data


def current_paths():
    return dict(corpus_paths._PATHS)


def resolve_spec(spec, paths=None):
    paths = paths or current_paths()
    base = paths.get(spec["path_key"])
    if base is None:
        return None
    path = Path(base)
    relative = spec.get("relative")
    return path / relative if relative else path


def bytes_used(path):
    if path is None or (not path.exists() and not path.is_symlink()):
        return 0
    result = subprocess.run(
        ["du", "-sx", "-B1", str(path)],
        capture_output=True, text=True, check=False, timeout=300,
    )
    try:
        return int(result.stdout.split()[0])
    except Exception:
        return None


def human(n):
    if n is None:
        return "?"
    value = float(n)
    for unit in ("B", "KiB", "MiB", "GiB", "TiB"):
        if value < 1024 or unit == "TiB":
            return f"{value:.1f} {unit}"
        value /= 1024


def mount_info(path):
    if path is None:
        return None
    probe = path
    while not probe.exists() and probe != probe.parent:
        probe = probe.parent
    result = subprocess.run(
        ["findmnt", "-T", str(probe), "-n", "-o", "SOURCE,FSTYPE,TARGET"],
        capture_output=True, text=True, check=False, timeout=30,
    )
    return result.stdout.strip() or None


def path_exists(path, kind="any"):
    if path is None:
        return False
    if kind == "dir":
        return path.is_dir() and not path.is_symlink()
    if kind == "file":
        return path.is_file() and not path.is_symlink()
    return path.exists() or path.is_symlink()


def python_packages(python):
    code = (
        "import importlib.metadata as m,json;"
        "print(json.dumps({(d.metadata.get('Name') or '').replace('-','_'):d.version "
        "for d in m.distributions() if d.metadata.get('Name')}))"
    )
    p = subprocess.run(
        [str(python), "-c", code],
        capture_output=True, text=True, check=False, timeout=120,
    )
    if p.returncode:
        return None, p.stdout + p.stderr
    try:
        return json.loads(p.stdout.splitlines()[-1]), ""
    except Exception as exc:
        return None, str(exc)


def territory_rows(policy=None, paths=None):
    policy = policy or load_policy()
    paths = paths or current_paths()
    rows = []
    for name, spec in policy["territories"].items():
        path = paths.get(spec["path_key"])
        path = Path(path) if path is not None else None
        exists = bool(path and (path.exists() or path.is_symlink()))
        rows.append({
            "territory": name,
            "path": str(path) if path else None,
            "exists": exists,
            "bytes": bytes_used(path) if exists else 0,
            "mount": mount_info(path) if path else None,
            "role": spec["role"],
            "truth": spec["truth"],
            "recovery": spec["recovery"],
            "backup": spec["backup"],
            "gc": spec["gc"],
        })
    return rows


def doctor(policy=None, paths=None):
    policy = policy or load_policy()
    paths = paths or current_paths()
    checks = []

    def add(level, ident, message, **extra):
        checks.append({"level": level, "id": ident, "message": message, **extra})

    # Canonical roots: absolute and distinct (vault may be absent).
    roots = {}
    for name, spec in policy["territories"].items():
        value = paths.get(spec["path_key"])
        if value is None:
            if spec.get("optional_mount"):
                add("WARN", f"territory.{name}.unconfigured", f"{name}: non configuré sur cette machine.")
                continue
            add("FAIL", f"territory.{name}.missing", f"{name}: root contractuel absent.")
            continue
        path = Path(value)
        if not path.is_absolute():
            add("FAIL", f"territory.{name}.relative", f"{name}: chemin non absolu: {path}")
        roots[name] = path.resolve(strict=False)
        if spec.get("optional_mount"):
            if not path.is_dir():
                add("WARN", f"territory.{name}.unavailable", f"{name}: configuré mais indisponible: {path}")
            else:
                mount = subprocess.run(
                    ["findmnt", "-T", str(path), "-n", "-o", "TARGET"],
                    capture_output=True, text=True, check=False, timeout=30,
                ).stdout.strip()
                if not mount or mount == "/":
                    add("WARN", f"territory.{name}.not_external", f"{name}: présent mais pas sur un montage externe distinct: {path}")
                else:
                    add("PASS", f"territory.{name}.available", f"{name}: disponible sur {mount}: {path}")

    reverse = {}
    for name, path in roots.items():
        reverse.setdefault(str(path), []).append(name)
    for path, names in reverse.items():
        if len(names) > 1:
            add("FAIL", "territories.alias", f"Territoires aliasés {names}: {path}")

    # Compatibility link remains explicit evidence, not canonical API.
    compat = corpus_paths.compatibility_status()
    if compat["is_symlink"] and compat["matches_runtime"]:
        add("PASS", "compat.dev-local", ".dev-local pointe vers le runtime canonique.")
    else:
        add("FAIL", "compat.dev-local", f".dev-local incompatible: {compat}")

    # Required organs stay inside their declared territory.
    for organ in policy["organs"]:
        path = resolve_spec(organ, paths)
        if not path_exists(path, organ.get("kind", "any")):
            add("FAIL" if organ.get("required") else "WARN", f"organ.{organ['id']}.missing", f"{organ['id']}: absent: {path}")
            continue
        territory_root = roots.get(organ["territory"])
        if territory_root is not None:
            try:
                path.resolve(strict=False).relative_to(territory_root)
            except ValueError:
                add("FAIL", f"organ.{organ['id']}.territory", f"{organ['id']} hors territoire {organ['territory']}: {path}")
                continue

        if organ.get("python_packages"):
            py = path / "bin/python"
            packages, error = python_packages(py)
            if packages is None:
                add("FAIL", f"organ.{organ['id']}.python", f"{organ['id']}: inventaire Python impossible: {error}")
            else:
                for package, expected in organ["python_packages"].items():
                    actual = packages.get(package.replace("-", "_"))
                    level = "PASS" if actual == expected else "FAIL"
                    add(level, f"organ.{organ['id']}.pkg.{package}", f"{package}: {actual!r} attendu {expected!r}")
                for package in organ.get("forbidden_python_packages", []):
                    actual = packages.get(package.replace("-", "_"))
                    add("FAIL" if actual else "PASS", f"organ.{organ['id']}.forbidden.{package}", f"{package}: {'présent '+actual if actual else 'absent'}")

        allowed = organ.get('allowed_top_level')
        if allowed is not None and path.is_dir():
            actual = sorted(item.name for item in path.iterdir())
            unexpected = sorted(set(actual) - set(allowed))
            add('FAIL' if unexpected else 'PASS', f"organ.{organ['id']}.top-level", f"actual={actual}; allowed={sorted(allowed)}; unexpected={unexpected}")

        for rel, expected in organ.get("executables", {}).items():
            exe = path / rel
            p = subprocess.run([str(exe), "--version"], capture_output=True, text=True, check=False, timeout=60)
            output = (p.stdout + p.stderr).strip()
            ok = p.returncode == 0 and expected in output
            add("PASS" if ok else "FAIL", f"organ.{organ['id']}.exe.{rel}", f"{rel}: {output.splitlines()[0] if output else 'échec'}")

    # Compatibility aliases are interfaces, never the physical source of truth.
    for item in policy.get('compatibility_links', []):
        link = resolve_spec(item['link'], paths)
        target = resolve_spec(item['target'], paths)
        ok = bool(link and target and link.is_symlink() and link.resolve(strict=False) == target.resolve(strict=False))
        add('PASS' if ok else 'FAIL', f"compat.{item['id']}", f"{link} -> {link.resolve(strict=False) if link and link.is_symlink() else None}; attendu {target}")

    # Known obsolete paths must stay absent.
    for item in policy["forbidden_paths"]:
        path = resolve_spec(item, paths)
        exists = bool(path and (path.exists() or path.is_symlink()))
        add("FAIL" if exists else "PASS", f"forbidden.{item['id']}", f"{path}: {'PRÉSENT' if exists else 'absent'} — {item['reason']}")

    # Probes represent runtime dependency laws.
    for probe in policy.get("probes", []):
        if probe["type"] == "python-import-under":
            python = resolve_spec(probe["python"], paths)
            under = resolve_spec(probe["under"], paths)
            if not python or not python.is_file() or not under:
                add("FAIL", f"probe.{probe['id']}", f"Probe impossible: python={python}, under={under}")
                continue
            code = (
                "import importlib.util,pathlib,sys;"
                f"s=importlib.util.find_spec({probe['module']!r});"
                "p=(pathlib.Path(s.origin).resolve() if s and s.origin else None);"
                "print(p or 'NONE')"
            )
            p = subprocess.run([str(python), "-c", code], capture_output=True, text=True, check=False, timeout=120)
            origin_text = p.stdout.strip().splitlines()[-1] if p.stdout.strip() else "NONE"
            try:
                origin = Path(origin_text)
                origin.resolve(strict=False).relative_to(under.resolve(strict=False))
                ok = p.returncode == 0
            except Exception:
                ok = False
            add("PASS" if ok else "FAIL", f"probe.{probe['id']}", f"{probe['module']} -> {origin_text}; attendu sous {under}")

    return checks


def drift(policy=None, paths=None):
    policy = policy or load_policy()
    paths = paths or current_paths()
    rows = []
    for item in policy.get("debts", []):
        path = resolve_spec(item, paths)
        exists = bool(path and (path.exists() or path.is_symlink()))
        if not exists:
            continue
        rows.append({
            **item,
            "path": str(path),
            "bytes": bytes_used(path),
        })
    return rows


def _lexical(path):
    """Absolute path without resolving symlinks: coverage classifies the namespace itself."""
    return Path(os.path.abspath(str(path)))


def _path_under(path, parent):
    try:
        _lexical(path).relative_to(_lexical(parent))
        return True
    except ValueError:
        return False


def _lifecycle_locations(policy, paths):
    rows = []
    for section in ("organs", "debts", "forbidden_paths", "intentional_exceptions"):
        for item in policy.get(section, []):
            path = resolve_spec(item, paths)
            if path is not None:
                rows.append({"path": _lexical(path), "section": section, "id": item.get("id")})
    for item in policy.get("compatibility_links", []):
        for side in ("link", "target"):
            spec = item.get(side)
            if not isinstance(spec, dict):
                continue
            path = resolve_spec(spec, paths)
            if path is not None:
                rows.append({"path": _lexical(path), "section": "compatibility_links", "id": item.get("id") + ":" + side})
    return rows


def _contract_locations(paths):
    rows = []
    for key, value in paths.items():
        if key == "machine_environment" or value is None:
            continue
        if not isinstance(value, (str, os.PathLike, Path)):
            continue
        try:
            path = Path(value)
        except TypeError:
            continue
        if not path.is_absolute():
            continue
        rows.append({"path": _lexical(path), "key": key})
    return rows


def coverage(policy=None, paths=None):
    """Classify direct children of declared coverage roots without changing them.

    DECLARED_* means a lifecycle object names the child or something below it.
    CONTRACT_* means only the path contract knows it. UNCLASSIFIED means neither
    the lifecycle nor path contract gives the child a structural identity.
    """
    policy = policy or load_policy()
    paths = paths or current_paths()
    lifecycle = _lifecycle_locations(policy, paths)
    contract = _contract_locations(paths)
    rows = []

    for root in policy.get("coverage_roots", []):
        base = paths.get(root["path_key"])
        if base is None:
            continue
        base = Path(base)
        if not base.is_dir():
            continue
        for child in sorted(base.iterdir(), key=lambda p: p.name):
            lexical = _lexical(child)
            exact_lifecycle = [x for x in lifecycle if x["path"] == lexical]
            nested_lifecycle = [x for x in lifecycle if x["path"] != lexical and _path_under(x["path"], lexical)]
            exact_contract = [x for x in contract if x["path"] == lexical]
            nested_contract = [x for x in contract if x["path"] != lexical and _path_under(x["path"], lexical)]

            if exact_lifecycle:
                status = "DECLARED_EXACT"
                evidence = [f"{x['section']}:{x['id']}" for x in exact_lifecycle]
            elif nested_lifecycle:
                status = "DECLARED_CONTAINER"
                evidence = [f"{x['section']}:{x['id']}" for x in nested_lifecycle]
            elif exact_contract:
                status = "CONTRACT_ONLY"
                evidence = [f"contract:{x['key']}" for x in exact_contract]
            elif nested_contract:
                status = "CONTRACT_CONTAINER"
                evidence = [f"contract:{x['key']}" for x in nested_contract]
            else:
                status = "UNCLASSIFIED"
                evidence = []

            rows.append({
                "root": root.get("id", root["path_key"]),
                "root_path": str(base),
                "name": child.name,
                "path": str(child),
                "kind": "symlink" if child.is_symlink() else "dir" if child.is_dir() else "file",
                "status": status,
                "bytes": bytes_used(child),
                "evidence": evidence,
            })
    return rows


def coverage_gaps(policy=None, paths=None):
    return [row for row in coverage(policy, paths) if row["status"] in {"CONTRACT_ONLY", "CONTRACT_CONTAINER", "UNCLASSIFIED"}]


def gc_preview(policy=None, paths=None):
    return [row for row in drift(policy, paths) if row.get("gc_candidate")]


def print_table(rows, columns):
    if not rows:
        print("<aucun>")
        return
    widths = {}
    for key, label in columns:
        widths[key] = max(len(label), *(len(str(row.get(key, ""))) for row in rows))
    header = "  ".join(label.ljust(widths[key]) for key, label in columns)
    print(header)
    print("  ".join("-" * widths[key] for key, _ in columns))
    for row in rows:
        print("  ".join(str(row.get(key, "")).ljust(widths[key]) for key, _ in columns))


def cmd_constitution(args):
    policy = load_policy()
    if args.json:
        print(json.dumps(policy, ensure_ascii=False, indent=2))
        return 0
    print("CORPUS CONSTITUTION v1")
    for name, spec in policy["territories"].items():
        print(f"- {name.upper():10} {spec['role']}")
        print(f"  truth={spec['truth']} recovery={spec['recovery']} backup={spec['backup']} gc={spec['gc']}")
    return 0


def cmd_map(args):
    rows = territory_rows()
    for row in rows:
        row["size"] = human(row["bytes"])
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    else:
        print_table(rows, [
            ("territory", "TERRITOIRE"),
            ("size", "TAILLE"),
            ("exists", "EXISTE"),
            ("path", "CHEMIN"),
        ])
    return 0


def cmd_doctor(args):
    rows = doctor()
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    else:
        for row in rows:
            print(f"{row['level']:<4} {row['id']}: {row['message']}")
        counts = {level: sum(r["level"] == level for r in rows) for level in ("PASS","WARN","FAIL")}
        print(f"\nPASS={counts['PASS']} WARN={counts['WARN']} FAIL={counts['FAIL']}")
    return 1 if any(row["level"] == "FAIL" for row in rows) else 0


def cmd_drift(args):
    rows = drift()
    for row in rows:
        row["size"] = human(row["bytes"])
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    else:
        print_table(rows, [
            ("severity","SEV"),
            ("class","CLASSE"),
            ("size","TAILLE"),
            ("id","ID"),
            ("path","CHEMIN"),
        ])
        print(f"\nDRIFT={len(rows)}")
    return 0


def cmd_coverage(args):
    rows = coverage_gaps() if args.gaps_only else coverage()
    for row in rows:
        row["size"] = human(row["bytes"])
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    else:
        print_table(rows, [
            ("root", "ROOT"),
            ("status", "STATUT"),
            ("size", "TAILLE"),
            ("kind", "TYPE"),
            ("name", "OBJET"),
            ("path", "CHEMIN"),
        ])
        gaps = sum(row["status"] in {"CONTRACT_ONLY", "CONTRACT_CONTAINER", "UNCLASSIFIED"} for row in rows)
        print(f"\nCOVERAGE_GAPS={gaps}")
    return 0


def cmd_gc(args):
    if not args.dry_run:
        raise SystemExit("Seul `gc --dry-run` existe dans la constitution v1.")
    rows = gc_preview()
    for row in rows:
        row["size"] = human(row["bytes"])
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
    else:
        print("GC DRY-RUN — aucune suppression")
        print_table(rows, [
            ("size","TAILLE"),
            ("id","ID"),
            ("path","CHEMIN"),
            ("reason","RAISON"),
        ])
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("constitution")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=cmd_constitution)

    p = sub.add_parser("map")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=cmd_map)

    p = sub.add_parser("doctor")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=cmd_doctor)

    p = sub.add_parser("drift")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=cmd_drift)

    p = sub.add_parser("coverage")
    p.add_argument("--json", action="store_true")
    p.add_argument("--gaps-only", action="store_true")
    p.set_defaults(func=cmd_coverage)

    p = sub.add_parser("gc")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=cmd_gc)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
