#!/usr/bin/env python3
"""Protocol-variation audit for the P005 v0.12 synthetic candidate.

The variations are sensitivity scenes, not probability distributions.  The
output reports persistence and failure separately; it is not a confidence rate.
"""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
from typing import Mapping

from run_p001 import load_config
from run_p005 import execute, make_verdict

ROOT = Path(__file__).resolve().parent

VARIATIONS: dict[str, dict[str, float]] = {
    "baseline": {},
    "hidden_complexity": {"complexity": 0.15},
    "weak_load_shedding": {"load_shedding": -0.20},
    "false_independence": {"cross_sector_map": -0.25},
    "core_erosion": {"protected_core": -0.18},
    "combined_pessimistic": {
        "complexity": 0.15,
        "load_shedding": -0.20,
        "cross_sector_map": -0.25,
        "protected_core": -0.18,
    },
}


def varied_config(base: Mapping[str, object], changes: Mapping[str, float]) -> dict[str, object]:
    config = deepcopy(base)
    candidate = str(config["reversal_rule"]["candidate"])
    mode = config["modes"][candidate]
    for key, delta in changes.items():
        mode[key] = max(0.0, min(1.0, float(mode[key]) + delta))
    return config


def audit(config: Mapping[str, object], runs: int = 180) -> list[dict[str, object]]:
    results = []
    for name, changes in VARIATIONS.items():
        varied = varied_config(config, changes)
        outcome = make_verdict(execute(varied, runs=runs), varied)
        results.append({
            "variation": name,
            "changes": changes,
            "verdict": outcome["verdict"],
            "gate_failure_protocols": outcome["gate_failure_protocols"],
            "predecessor_improvement_protocols": outcome["predecessor_improvement_protocols"],
            "simple_dominance_protocols": outcome["simple_dominance_protocols"],
            "yield_claim_status": (
                "persists"
                if len(outcome["predecessor_improvement_protocols"]) >= 4
                else "not_established_under_variation"
            ),
        })
    return results


def write_report(results: list[dict[str, object]], path: Path) -> None:
    lines = [
        "# Robustesse de protocole P005-DT-002-R1", "",
        "Ces variations sont des analyses de sensibilité déclarées, non des probabilités sur le monde.", "",
        "| Variation | Verdict de viabilité | Protocoles perdant une porte | Gain face à v0.11 | Statut du gain | Domination simple |",
        "|---|---|---|---:|---|---|",
    ]
    for item in results:
        failures = ", ".join(item["gate_failure_protocols"]) or "aucun"
        dominates = ", ".join(item["simple_dominance_protocols"]) or "aucune"
        lines.append(
            f"| {item['variation']} | {item['verdict']} | {failures} | "
            f"{len(item['predecessor_improvement_protocols'])}/6 | {item['yield_claim_status']} | {dominates} |"
        )
    rejected = [item["variation"] for item in results if "_rejected" in str(item["verdict"])]
    yield_failures = [item["variation"] for item in results if item["yield_claim_status"] != "persists"]
    lines.extend([
        "", "## Conclusion", "",
        "La candidate est classée dépendante du protocole si une variation plausible préspécifiée renverse son verdict. "
        + (f"Renversements observés : {', '.join(rejected)}." if rejected else "Aucun renversement n'est produit dans cette famille de variations."),
        "", "Le verdict de viabilité et le gain de rendement sont distincts. "
        + (f"Le gain face à v0.11 n'est plus établi sous : {', '.join(yield_failures)}." if yield_failures else "Le gain face à v0.11 persiste dans toutes les variations."),
        "", "Un maintien du verdict n'établit pas la robustesse territoriale ; il borne seulement cette famille de sensibilité.",
    ])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    config = load_config(ROOT / "p005_config_v2.json")
    results = audit(config)
    output = ROOT / "results-p005-robustness"
    output.mkdir(parents=True, exist_ok=True)
    (output / "results.json").write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    write_report(results, output / "report.md")
    print(json.dumps(results))


if __name__ == "__main__":
    main()
