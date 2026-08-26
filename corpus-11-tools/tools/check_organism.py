#!/usr/bin/env python3
"""Validate Corpus living-continuity state without promoting research to runtime."""
from __future__ import annotations

from copy import deepcopy
from pathlib import Path
import argparse
import json
import re
import subprocess
from typing import Any


PLUGIN_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PLUGIN_ROOT.parent
STATE_PATH = PLUGIN_ROOT / "skills" / "corpus-11-routing" / "references" / "organism-state.json"
CONTRACT_PATH = STATE_PATH.with_name("organism-contract.md")
ROUTER_PATH = PLUGIN_ROOT / "skills" / "corpus-11-routing" / "SKILL.md"
INVENTORY_PATH = PLUGIN_ROOT / "docs" / "inventory.json"
MANIFEST_PATH = PLUGIN_ROOT / ".codex-plugin" / "plugin.json"

REQUIRED_CARRIERS = {
    "active_body": ("plugin", "routable_when_installed"),
    "experimental_organs": ("plugin", "generic_instruments"),
    "validation_and_repair": ("plugin", "non_regression_not_general_validity"),
    "historical_memory": ("plugin", "non_executable_by_default"),
    "repository_sensorium": ("repository", "project_evidence_not_product_runtime"),
    "transfer_membrane": ("repository", "candidate_accept_reject_boundary"),
}
REQUIRED_ACTIVATION_SEQUENCE = [
    "project_observation",
    "generic_candidate",
    "accepted_transfer",
    "product_integration",
    "product_tests",
    "release",
    "installation",
    "context_access",
    "reobservation",
]


def load_object(path: Path, errors: list[str]) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"cannot read {path.relative_to(REPO_ROOT)}: {exc}")
        return {}
    if not isinstance(value, dict):
        errors.append(f"{path.relative_to(REPO_ROOT)} must contain a JSON object")
        return {}
    return value


def tagged_commit(release: str) -> str | None:
    proc = subprocess.run(
        ["git", "rev-list", "-n", "1", release],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
    )
    return proc.stdout.strip() if proc.returncode == 0 else None


def is_ancestor(older: str, newer: str) -> bool:
    return subprocess.run(
        ["git", "merge-base", "--is-ancestor", older, newer],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
    ).returncode == 0


def commit_exists(commit: str) -> bool:
    return subprocess.run(
        ["git", "cat-file", "-e", f"{commit}^{{commit}}"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
    ).returncode == 0


def remote_tags() -> tuple[dict[str, dict[str, str]], str | None]:
    proc = subprocess.run(
        ["git", "ls-remote", "--tags", "origin"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        return {}, (proc.stderr or proc.stdout).strip()
    records: dict[str, dict[str, str]] = {}
    prefix = "refs/tags/"
    for line in proc.stdout.splitlines():
        object_id, ref = line.split("\t", 1)
        if not ref.startswith(prefix):
            continue
        name = ref[len(prefix) :]
        peeled = name.endswith("^{}")
        if peeled:
            name = name[:-3]
        field = "commit" if peeled else "tag_object"
        records.setdefault(name, {})[field] = object_id
        if not peeled:
            records[name].setdefault("commit", object_id)
    return records, None


def validate_state(
    state: dict[str, Any],
    inventory: dict[str, Any],
    manifest: dict[str, Any],
    *,
    check_paths: bool = True,
    check_tags: bool = True,
    check_remote_tags: bool = False,
) -> list[str]:
    errors: list[str] = []
    if state.get("schema_version") != 1:
        errors.append("organism state schema_version must be 1")
    if state.get("organism") != "Corpus 11":
        errors.append("organism identity must remain 'Corpus 11'")

    current = state.get("current_product")
    if not isinstance(current, dict):
        errors.append("current_product must be an object")
        current = {}
    expected_current = {
        "name": manifest.get("name"),
        "release": inventory.get("release"),
        "version": inventory.get("version"),
    }
    for field, expected in expected_current.items():
        if current.get(field) != expected:
            errors.append(
                f"current_product.{field}={current.get(field)!r}, expected {expected!r}"
            )

    continuity = state.get("continuity")
    if not isinstance(continuity, dict):
        errors.append("continuity must be an object")
        continuity = {}
    if continuity.get("immutable_content_kernel") is not False:
        errors.append("immutable_content_kernel must be false")
    if continuity.get("stable_does_not_mean_unchanged") is not True:
        errors.append("stable_does_not_mean_unchanged must be true")
    if continuity.get("research_is_automatically_runtime") is not False:
        errors.append("research_is_automatically_runtime must be false")

    carriers = state.get("carriers")
    if not isinstance(carriers, list):
        errors.append("carriers must be a list")
        carriers = []
    carrier_map: dict[str, dict[str, Any]] = {}
    for item in carriers:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str):
            errors.append(f"invalid carrier: {item!r}")
            continue
        identifier = item["id"]
        if identifier in carrier_map:
            errors.append(f"duplicate carrier id: {identifier}")
        carrier_map[identifier] = item
    if set(carrier_map) != set(REQUIRED_CARRIERS):
        errors.append(
            "carrier set mismatch: "
            + repr(sorted(set(carrier_map) ^ set(REQUIRED_CARRIERS)))
        )
    for identifier, (scope, runtime_status) in REQUIRED_CARRIERS.items():
        item = carrier_map.get(identifier, {})
        if item.get("scope") != scope:
            errors.append(f"{identifier}.scope must be {scope!r}")
        if item.get("runtime_status") != runtime_status:
            errors.append(f"{identifier}.runtime_status must be {runtime_status!r}")
        paths = item.get("paths")
        if not isinstance(paths, list) or not paths or not all(
            isinstance(path, str) and path and not Path(path).is_absolute()
            for path in paths
        ):
            errors.append(f"{identifier}.paths must be non-empty relative paths")
            continue
        if check_paths:
            root = PLUGIN_ROOT if scope == "plugin" else REPO_ROOT
            for relative in paths:
                target = (root / relative).resolve()
                if root.resolve() not in target.parents and target != root.resolve():
                    errors.append(f"{identifier} path escapes its scope: {relative}")
                elif not target.exists():
                    errors.append(f"{identifier} path is missing: {relative}")

    if state.get("activation_sequence") != REQUIRED_ACTIVATION_SEQUENCE:
        errors.append("activation_sequence does not preserve the declared lifecycle")

    lineage = state.get("release_lineage")
    if not isinstance(lineage, list) or not lineage:
        errors.append("release_lineage must be a non-empty list")
        lineage = []
    seen: set[str] = set()
    previous: str | None = None
    previous_anchor: str | None = None
    for index, item in enumerate(lineage):
        if not isinstance(item, dict):
            errors.append(f"release_lineage[{index}] must be an object")
            continue
        release = item.get("release")
        commit = item.get("commit")
        tag_object = item.get("tag_object")
        tag_scope = item.get("tag_scope")
        if not isinstance(release, str) or not re.fullmatch(
            r"v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", release
        ):
            errors.append(f"release_lineage[{index}] has invalid release {release!r}")
            continue
        if release in seen:
            errors.append(f"duplicate release in lineage: {release}")
        seen.add(release)
        if item.get("predecessor_release") != previous:
            errors.append(
                f"{release}.predecessor_release={item.get('predecessor_release')!r}, "
                f"expected {previous!r}"
            )
        relation = item.get("lineage_relation")
        expected_relations = {"origin"} if previous is None else {
            "git_ancestor",
            "published_successor_non_ancestor",
        }
        if relation not in expected_relations:
            errors.append(f"{release}.lineage_relation is invalid: {relation!r}")
        is_current = index == len(lineage) - 1 and release == current.get("release")
        anchor: str | None = None
        if commit is None and not is_current:
            errors.append(f"{release}.commit may be null only for the current release")
        elif commit is not None and (
            not isinstance(commit, str) or not re.fullmatch(r"[0-9a-f]{40}", commit)
        ):
            errors.append(f"{release}.commit must be null or a full lowercase Git commit")
        elif commit is not None:
            anchor = commit
            if check_tags and not commit_exists(commit):
                errors.append(f"{release}.commit is missing locally: {commit}")
        elif check_tags:
            anchor = tagged_commit(release)
            if anchor is None:
                errors.append(f"current release tag is missing: {release}")

        if is_current:
            if tag_scope != "current_release" or tag_object is not None:
                errors.append(
                    f"{release} must use current_release with a null tag_object"
                )
        elif index == 0:
            if tag_scope != "local_historical_anchor_remote_absent":
                errors.append(f"{release} must declare its local-only anchor scope")
            if not isinstance(tag_object, str) or not re.fullmatch(
                r"[0-9a-f]{40}", tag_object
            ):
                errors.append(f"{release}.tag_object must be a full Git object")
        else:
            if tag_scope != "public_origin":
                errors.append(f"{release} must declare public_origin tag scope")
            if not isinstance(tag_object, str) or not re.fullmatch(
                r"[0-9a-f]{40}", tag_object
            ):
                errors.append(f"{release}.tag_object must be a full Git object")

        if (
            check_tags
            and previous_anchor is not None
            and anchor is not None
            and relation in expected_relations
        ):
            ancestry = is_ancestor(previous_anchor, anchor)
            if relation == "git_ancestor" and not ancestry:
                errors.append(f"{previous} is not a Git ancestor of {release}")
            if relation == "published_successor_non_ancestor" and ancestry:
                errors.append(
                    f"{release} declares a non-ancestor repair but Git is continuous"
                )
        previous = release
        previous_anchor = anchor or previous_anchor
    if lineage and isinstance(lineage[-1], dict):
        if lineage[-1].get("release") != current.get("release"):
            errors.append("current release is not the final release-lineage entry")

    if check_remote_tags:
        observed_tags, remote_error = remote_tags()
        if remote_error:
            errors.append(f"cannot read public origin tags: {remote_error}")
        else:
            for item in lineage:
                if not isinstance(item, dict):
                    continue
                release = item.get("release")
                scope = item.get("tag_scope")
                observed = observed_tags.get(release, {})
                if scope == "local_historical_anchor_remote_absent":
                    if observed:
                        errors.append(f"{release} is no longer absent from public origin")
                elif scope == "public_origin":
                    if observed.get("tag_object") != item.get("tag_object"):
                        errors.append(f"{release} public tag object differs")
                    if observed.get("commit") != item.get("commit"):
                        errors.append(f"{release} public peeled commit differs")
                elif scope == "current_release":
                    local_current = tagged_commit(str(release))
                    if observed.get("commit") != local_current:
                        errors.append(f"{release} is not published at its local commit")

    return errors


def validate_files(*, check_remote_tags: bool = False) -> list[str]:
    errors: list[str] = []
    state = load_object(STATE_PATH, errors)
    inventory = load_object(INVENTORY_PATH, errors)
    manifest = load_object(MANIFEST_PATH, errors)
    if state and inventory and manifest:
        errors.extend(
            validate_state(
                state,
                inventory,
                manifest,
                check_remote_tags=check_remote_tags,
            )
        )

    try:
        router = ROUTER_PATH.read_text(encoding="utf-8")
        contract = CONTRACT_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        errors.append(f"organism routing files are unreadable: {exc}")
        return errors
    for reference in (
        "references/organism-contract.md",
        "references/organism-state.json",
    ):
        if reference not in router:
            errors.append(f"router does not load {reference}")
    for statement in (
        "The current installed release is the active body.",
        "A stable invariant establishes continuity across change.",
        "a research result is not an active rule",
    ):
        if statement not in contract:
            errors.append(f"organism contract missing guard: {statement!r}")
    return errors


def run_self_test() -> list[str]:
    errors: list[str] = []
    state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    inventory = json.loads(INVENTORY_PATH.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    mutations: list[tuple[str, dict[str, Any], str]] = []
    version_drift = deepcopy(state)
    version_drift["current_product"]["version"] = "0.0.0"
    mutations.append(("version drift", version_drift, "current_product.version"))

    runtime_promotion = deepcopy(state)
    for carrier in runtime_promotion["carriers"]:
        if carrier["id"] == "repository_sensorium":
            carrier["runtime_status"] = "routable_when_installed"
    mutations.append(
        (
            "research runtime promotion",
            runtime_promotion,
            "repository_sensorium.runtime_status",
        )
    )

    broken_lineage = deepcopy(state)
    broken_lineage["release_lineage"][-1]["predecessor_release"] = "v0.0.0"
    mutations.append(("broken lineage", broken_lineage, ".predecessor_release="))

    missing_body = deepcopy(state)
    for carrier in missing_body["carriers"]:
        if carrier["id"] == "active_body":
            carrier["paths"] = ["missing-active-body"]
    mutations.append(("missing active body", missing_body, "path is missing"))

    for name, mutated, marker in mutations:
        observed = validate_state(
            mutated,
            inventory,
            manifest,
            check_paths=True,
            check_tags=False,
        )
        if not any(marker in error for error in observed):
            errors.append(f"self-test did not reject {name}: {observed}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--require-remote-tags", action="store_true")
    args = parser.parse_args()
    errors = validate_files(check_remote_tags=args.require_remote_tags)
    if args.self_test and not errors:
        errors.extend(run_self_test())
    if errors:
        print("FAIL")
        for error in errors:
            print(" -", error)
        return 1
    suffix = "; adversarial mutations rejected" if args.self_test else ""
    if args.require_remote_tags:
        suffix += "; public origin tags verified"
    print(
        "PASS: Corpus organism state, release lineage, carriers, and "
        "activation boundary are coherent" + suffix
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
