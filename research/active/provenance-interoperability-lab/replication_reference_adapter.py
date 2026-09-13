"""Reference adapter for the frozen provenance-core replication contract.

It wraps the existing v0.2 encoder/decoder test functions and exposes their
already-defined observations.  The collision and extension entries make the
existing failure conditions visible to the replication comparison; they do not
alter the v0.2 test's rules or conclusion.
"""

from __future__ import annotations

from copy import deepcopy
import importlib.util
import json
from pathlib import Path
from typing import Any


LAB = Path(__file__).resolve().parent
REFERENCE = LAB / "tests/test_core_mutations.py"


def _load_reference():
    spec = importlib.util.spec_from_file_location("provenance_core_reference", REFERENCE)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load provenance-core reference")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _pointer(path: tuple[object, ...]) -> str:
    return "/" + "/".join(str(item).replace("~", "~0").replace("/", "~1") for item in path)


def _reject_collision(core: dict[str, Any], receipt: dict[str, Any], reference) -> str:
    registry: dict[str, dict[str, Any]] = {core["receipt_id"]: core}
    conflicting = deepcopy(receipt)
    conflicting["claim"]["text"] = f"{conflicting['claim']['text']}__collision"
    conflicting_core = reference.core(conflicting)
    if conflicting_core["receipt_id"] in registry and registry[conflicting_core["receipt_id"]] != conflicting_core:
        return "rejected"
    return "absorbed"


def run_fixture(fixture: dict[str, Any], contract: dict[str, Any]) -> dict[str, Any]:
    """Produce only the research-declared comparable results."""
    research_contract = contract["research_contract"]
    reference = _load_reference()
    receipt = fixture["receipt"]
    baseline = reference.core(receipt)
    paths = reference.scalar_paths(baseline)
    profiles = [(reference.to_entity_profile, reference.from_entity_profile), (reference.to_graph_profile, reference.from_graph_profile)]

    baseline_preserved = []
    extension_located = []
    mutation_results = []
    for path in paths:
        changed_core = reference.mutate(baseline, path)
        changed_receipt = deepcopy(receipt)
        changed_receipt.update(changed_core)
        detected = []
        for encode, decode in profiles:
            restored_baseline = reference.round_trip(receipt, encode, decode)
            baseline_preserved.append(reference.core(restored_baseline) == baseline)
            extension_located.append(
                "display_note" not in restored_baseline and restored_baseline.get("loss_ledger") == ["display_note"]
            )
            restored = reference.round_trip(changed_receipt, encode, decode)
            restored_core = reference.core(restored)
            detected.append(restored_core == changed_core and restored_core != baseline)
        mutation_results.append({"path": _pointer(path), "detected_by_all_profiles": all(detected)})

    if len(paths) != research_contract["core_scalar_count"]:
        raise ValueError("frozen provenance core scalar count differs from the output contract")
    return {
        "schema": research_contract["output_schema"],
        "protocol_id": research_contract["protocol_id"],
        "core": {
            "baseline_preserved": all(baseline_preserved),
            "core_scalar_count": len(paths),
            "profiles_tested": len(profiles),
        },
        "collision": {"verdict": _reject_collision(baseline, receipt, reference)},
        "extension": {
            "field": research_contract["extension_field"],
            "status": "loss_explicitly_located" if all(extension_located) else "lost_silently",
        },
        "mutation_results": mutation_results,
    }
