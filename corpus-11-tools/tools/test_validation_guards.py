#!/usr/bin/env python3
"""Adversarially prove that validation gates reject corrupted repository states."""
from __future__ import annotations

from pathlib import Path
import json
import shutil
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
SOURCE_REPO = HERE.parents[1]


def copy_repo(destination: Path) -> Path:
    shutil.copytree(
        SOURCE_REPO,
        destination,
        ignore=shutil.ignore_patterns(
            ".git", "node_modules", ".next", "__pycache__", ".pytest_cache"
        ),
    )
    return destination


def run_validator(repo: Path, script: str) -> subprocess.CompletedProcess[str]:
    plugin = repo / "corpus-11-tools"
    return subprocess.run(
        [sys.executable, str(plugin / "tools" / script)],
        cwd=plugin,
        text=True,
        capture_output=True,
    )


def require_success(proc: subprocess.CompletedProcess[str], label: str) -> None:
    if proc.returncode != 0:
        raise AssertionError(
            f"baseline validator failed for {label}:\n{proc.stdout}\n{proc.stderr}"
        )


def require_failure(proc: subprocess.CompletedProcess[str], label: str) -> None:
    if proc.returncode == 0:
        raise AssertionError(
            f"validator false-negative for {label}:\n{proc.stdout}\n{proc.stderr}"
        )


def mutate_missing_withdrawal(repo: Path) -> tuple[str, str]:
    path = repo / "transfers" / "accepted" / "project-yield-gate.md"
    text = path.read_text(encoding="utf-8")
    lines = [line for line in text.splitlines() if "Condition de retrait" not in line]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return "check_boundaries.py", "accepted transfer without withdrawal condition"


def mutate_reverse_research_dependency(repo: Path) -> tuple[str, str]:
    path = repo / "corpus-11-tools" / "labs" / "python" / "corpus_labs" / "event_store.py"
    path.write_text(
        path.read_text(encoding="utf-8") + "\n# forbidden dependency: research/active/cct\n",
        encoding="utf-8",
    )
    return "check_boundaries.py", "product runtime referencing project research"


def mutate_candidate_transfer_runtime_import(repo: Path) -> tuple[str, str]:
    path = repo / "corpus-11-tools" / "labs" / "python" / "corpus_labs" / "event_store.py"
    path.write_text(
        path.read_text(encoding="utf-8") + "\n# candidate transfer: conversational_surface\n",
        encoding="utf-8",
    )
    return "check_boundaries.py", "product runtime importing candidate transfer"


def mutate_missing_capability_folder(repo: Path) -> tuple[str, str]:
    path = repo / "corpus-11-tools" / "skills" / "protocol-robustness"
    shutil.rmtree(path)
    return "check_graph.py", "declared capability folder removed"


def mutate_duplicate_eval_id(repo: Path) -> tuple[str, str]:
    plugin = repo / "corpus-11-tools"
    eval_path = plugin / "evals" / "routing-and-nonregression.jsonl"
    records = [json.loads(line) for line in eval_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    duplicate = dict(records[-1])
    duplicate["id"] = records[0]["id"]
    with eval_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(duplicate, ensure_ascii=False) + "\n")
    inventory_path = plugin / "docs" / "inventory.json"
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    inventory["eval_count"] += 1
    inventory_path.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return "check_evals.py", "duplicate eval id with matching declared cardinality"


def mutate_unknown_expected_skill(repo: Path) -> tuple[str, str]:
    plugin = repo / "corpus-11-tools"
    eval_path = plugin / "evals" / "routing-and-nonregression.jsonl"
    records = [json.loads(line) for line in eval_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    records[0]["expect"] = ["ghost-skill-does-not-exist"]
    eval_path.write_text(
        "\n".join(json.dumps(record, ensure_ascii=False) for record in records) + "\n",
        encoding="utf-8",
    )
    return "check_evals.py", "eval expecting nonexistent skill"


def mutate_remove_unique_positive_coverage(repo: Path) -> tuple[str, str]:
    plugin = repo / "corpus-11-tools"
    eval_path = plugin / "evals" / "routing-and-nonregression.jsonl"
    records = [json.loads(line) for line in eval_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    for record in records:
        if record.get("id") == "coverage-media-power-01":
            record.pop("expect", None)
            record["must_not"] = ["route nowhere"]
            break
    eval_path.write_text(
        "\n".join(json.dumps(record, ensure_ascii=False) for record in records) + "\n",
        encoding="utf-8",
    )
    return "check_evals.py", "capability losing all positive routing coverage"


def mutate_eval_without_oracle(repo: Path) -> tuple[str, str]:
    plugin = repo / "corpus-11-tools"
    eval_path = plugin / "evals" / "routing-and-nonregression.jsonl"
    records = [json.loads(line) for line in eval_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    records[0] = {"id": records[0]["id"], "prompt": records[0]["prompt"], "may": ["chain-tracing"]}
    eval_path.write_text(
        "\n".join(json.dumps(record, ensure_ascii=False) for record in records) + "\n",
        encoding="utf-8",
    )
    return "check_evals.py", "eval with no hard oracle"


def mutate_integrity_target(repo: Path) -> tuple[str, str]:
    path = (
        repo
        / "corpus-11-tools"
        / "skills"
        / "provenance-audit"
        / "references"
        / "01_CONTRAT_SEMANTIQUE_11_v4.md"
    )
    path.write_text(path.read_text(encoding="utf-8") + "\nTAMPERED\n", encoding="utf-8")
    return "check_integrity.py", "cryptographic source tampering"


def mutate_missing_integrity_target(repo: Path) -> tuple[str, str]:
    path = (
        repo
        / "corpus-11-tools"
        / "skills"
        / "provenance-audit"
        / "references"
        / "07_PROVENANCE_RECOVERED_LEGACY.csv"
    )
    path.unlink()
    return "check_integrity.py", "registered integrity target removed"


def mutate_manifest_inventory_version_drift(repo: Path) -> tuple[str, str]:
    path = repo / "corpus-11-tools" / "docs" / "inventory.json"
    inventory = json.loads(path.read_text(encoding="utf-8"))
    inventory["version"] = "9.9.9+mutated"
    path.write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return "validate_package.py", "manifest/inventory version drift"


def mutate_documented_eval_count(repo: Path) -> tuple[str, str]:
    path = repo / "README.md"
    path.write_text(
        path.read_text(encoding="utf-8") + "\nCompteur erroné de contrôle : 76 évaluations.\n",
        encoding="utf-8",
    )
    return "check_docs.py", "public README stale eval count alongside current marker"


def mutate_stability_contract_eval_count(repo: Path) -> tuple[str, str]:
    path = repo / "corpus-11-tools" / "docs" / "stability-contract.md"
    path.write_text(
        path.read_text(encoding="utf-8").replace(
            "| Évaluations | 77 |", "| Évaluations | 76 |"
        ),
        encoding="utf-8",
    )
    return "check_docs.py", "stability-contract eval-count drift"


def mutate_surface_contract_omission(repo: Path) -> tuple[str, str]:
    path = repo / "transfers" / "candidates" / "conversational-corpus-surface-evals.jsonl"
    records = [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    records[0]["surface_must_not_change"].remove("reversal conditions")
    path.write_text(
        "\n".join(json.dumps(record, ensure_ascii=False) for record in records) + "\n",
        encoding="utf-8",
    )
    return "check_conversational_surface.py", "candidate surface missing reversal protection"


def mutate_graph_copy_drift(repo: Path) -> tuple[str, str]:
    path = (
        repo
        / "corpus-11-tools"
        / "skills"
        / "provenance-audit"
        / "references"
        / "06_GRAPH_11_OPTIMIZED_v4.dsl"
    )
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    relation_index = next(
        (
            index
            for index, line in enumerate(lines)
            if line.startswith(("CAP.", "FAM."))
            and " -> " in line
            and "{ criticality:" in line
        ),
        None,
    )
    if relation_index is None:
        raise AssertionError("mutation fixture cannot find a canonical relation line")
    del lines[relation_index]
    path.write_text("".join(lines), encoding="utf-8")
    return "check_graph.py", "one canonical graph copy losing a relation"


MUTATIONS = [
    mutate_missing_withdrawal,
    mutate_reverse_research_dependency,
    mutate_candidate_transfer_runtime_import,
    mutate_missing_capability_folder,
    mutate_duplicate_eval_id,
    mutate_unknown_expected_skill,
    mutate_remove_unique_positive_coverage,
    mutate_eval_without_oracle,
    mutate_integrity_target,
    mutate_missing_integrity_target,
    mutate_manifest_inventory_version_drift,
    mutate_documented_eval_count,
    mutate_stability_contract_eval_count,
    mutate_surface_contract_omission,
    mutate_graph_copy_drift,
]


def main() -> int:
    # First prove that the validators under test accept the untouched branch.
    for validator in (
        "validate_package.py",
        "check_graph.py",
        "check_docs.py",
        "check_boundaries.py",
        "check_conversational_surface.py",
        "check_integrity.py",
        "check_evals.py",
    ):
        require_success(run_validator(SOURCE_REPO, validator), f"untouched {validator}")

    with tempfile.TemporaryDirectory() as raw:
        base = Path(raw)
        for index, mutation in enumerate(MUTATIONS, 1):
            repo = copy_repo(base / f"case-{index:02d}")
            validator, label = mutation(repo)
            require_failure(run_validator(repo, validator), label)
            print(f"PASS mutation {index:02d}: {label}")

    print(f"PASS: {len(MUTATIONS)} adversarial repository mutations rejected")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
