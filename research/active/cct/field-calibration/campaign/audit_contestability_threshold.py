#!/usr/bin/env python3
"""Exact audit of the contestability proxy used by CCT-SC-D10-001.

This module analyzes the already-declared equations. It does not generate a new
campaign and does not treat the proxy as an observed trace or usable recourse.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from fractions import Fraction
import json
from pathlib import Path
from typing import Mapping

from run_d10_campaign import execute, load_config, varied_mechanisms


ROOT = Path(__file__).resolve().parent
CHANNEL_COEFFICIENT = Fraction(9, 25)
PERTURBATION_COEFFICIENT = Fraction(6, 25)
PASS_THRESHOLD = Fraction(1, 2)


def exact(value: object) -> Fraction:
    return Fraction(str(value))


def audit(config: Mapping[str, object], result: Mapping[str, object]) -> dict[str, object]:
    variation = "d10_constrained_recourse"
    selected = [row for row in result["rows"] if row["variation"] == variation]
    if not selected:
        raise ValueError("no rows available for constrained-recourse threshold audit")
    mechanisms = varied_mechanisms(config, variation)
    configured_contestability = exact(mechanisms["d10"]["contestability"])
    cells: dict[tuple[Fraction, Fraction], list[Mapping[str, object]]] = defaultdict(list)
    for row in selected:
        cells[(exact(row["world"]["channel"]), exact(row["world"]["perturbation"]))].append(row)

    cell_records = []
    reconstructed_below = []
    for (channel, perturbation), rows in sorted(cells.items()):
        threshold = PASS_THRESHOLD + CHANNEL_COEFFICIENT * channel + PERTURBATION_COEFFICIENT * perturbation
        margin = configured_contestability - threshold
        pipeline_margins = {exact(row["outcomes"]["d10"]["contestability_margin"]) for row in rows}
        if pipeline_margins != {margin}:
            raise ValueError("exact threshold audit disagrees with campaign rows")
        proxy_passes = margin >= 0
        if not proxy_passes:
            reconstructed_below.extend(str(row["world_id"]) for row in rows)
        cell_records.append({
            "channel": str(channel),
            "perturbation": str(perturbation),
            "threshold_fraction": str(threshold),
            "threshold_decimal": float(threshold),
            "configured_contestability_fraction": str(configured_contestability),
            "margin_fraction": str(margin),
            "margin_decimal": float(margin),
            "proxy_passes": proxy_passes,
            "multiplicity": len(rows),
        })

    classified = result["classification"][variation][
        "d10_contestability_proxy_below_threshold_worlds"
    ]
    if sorted(reconstructed_below) != sorted(classified):
        raise ValueError("analytic reconstruction disagrees with classifier")

    threshold_cell_counts: Counter[Fraction] = Counter()
    threshold_row_counts: Counter[Fraction] = Counter()
    for record in cell_records:
        threshold = exact(record["threshold_fraction"])
        threshold_cell_counts[threshold] += 1
        threshold_row_counts[threshold] += int(record["multiplicity"])
    step_intervals = []
    lower = None
    passing_cells = 0
    passing_rows = 0
    for threshold in sorted(threshold_cell_counts):
        step_intervals.append({
            "lower_inclusive": None if lower is None else str(lower),
            "upper_exclusive": str(threshold),
            "passing_cells": passing_cells,
            "passing_rows": passing_rows,
        })
        passing_cells += threshold_cell_counts[threshold]
        passing_rows += threshold_row_counts[threshold]
        lower = threshold
    step_intervals.append({
        "lower_inclusive": str(lower),
        "upper_exclusive": None,
        "passing_cells": len(cell_records),
        "passing_rows": len(selected),
    })

    multiplicities = Counter(len(rows) for rows in cells.values())
    d10_relative = {
        exact(row["outcomes"]["d10"]["contestability_margin"])
        - exact(row["outcomes"]["baseline"]["contestability_margin"])
        for row in selected
    }
    failing_cell_count = sum(not record["proxy_passes"] for record in cell_records)
    multiplicity_description = ", ".join(
        f"{multiplicity} rows in {count} cell{'s' if count != 1 else ''}"
        for multiplicity, count in sorted(multiplicities.items())
    )
    return {
        "protocol": result["protocol"],
        "variation": variation,
        "scope": {
            "threshold_map": "formal_exact",
            "artifact_reconstruction": "pipeline_verified",
            "trace_or_recourse": "unknown",
        },
        "formula": "margin = contestability - 9/25*channel - 6/25*perturbation - 1/2",
        "configured_contestability_fraction": str(configured_contestability),
        "unique_functional_cells": len(cells),
        "rows": len(selected),
        "multiplicity_distribution": {str(key): value for key, value in sorted(multiplicities.items())},
        "inactive_axes_for_proxy": ["load", "rhythm", "environment"],
        "cells": cell_records,
        "step_intervals": step_intervals,
        "below_threshold_rows": len(reconstructed_below),
        "above_or_equal_threshold_rows": len(selected) - len(reconstructed_below),
        "continuous_representation": {
            "id": "contestability_margin",
            "binary_representation": "indicator(margin >= 0)",
            "relationship": "non_discriminating_representation_pair",
            "information_retention": "the continuous margin retains distance to threshold",
            "independent_evidence_gain": "none",
        },
        "relative_comparator_margin_fractions": sorted(str(value) for value in d10_relative),
        "construct_validity": "proxy_substitution",
        "strongest_conclusion": (
            f"The {len(reconstructed_below)}/{len(selected)} count is exactly "
            f"{failing_cell_count}/{len(cells)} failing channel-perturbation cells, with "
            f"multiplicities {multiplicity_description}. It establishes a configured "
            "proxy-threshold event, not an unusable trace or recourse."
        ),
        "withdrawal_condition": (
            "Withdraw the map if any campaign row depends on an inactive axis, an inclusive threshold is "
            "implemented differently, or the reconstructed cells no longer match the recorded classifier."
        ),
    }


def write_report(assessment: Mapping[str, object], path: Path) -> None:
    failing_cells = [cell for cell in assessment["cells"] if not cell["proxy_passes"]]
    multiplicity_distribution = assessment["multiplicity_distribution"]
    multiplicity_summary = ", ".join(
        f"`{multiplicity}` pour {count} cellule{'s' if int(count) != 1 else ''}"
        for multiplicity, count in multiplicity_distribution.items()
    )
    inactive_axes = ", ".join(str(axis) for axis in assessment["inactive_axes_for_proxy"])
    relative_margins = list(assessment["relative_comparator_margin_fractions"])
    if len(relative_margins) == 1:
        relative_margin_summary = (
            f"La marge relative D10–témoin vaut `{relative_margins[0]}` dans toutes les "
            "lignes de la variation."
        )
    elif relative_margins:
        relative_margin_summary = (
            "Les marges relatives D10–témoin observées dans la variation sont : "
            + ", ".join(f"`{margin}`" for margin in relative_margins)
            + "."
        )
    else:
        relative_margin_summary = "Aucune marge relative D10–témoin n'est disponible."
    lines = [
        "# Audit exact du seuil de contestabilité D10", "",
        "## Conclusion", "",
        f"La valeur `{assessment['below_threshold_rows']}/{assessment['rows']}` est exactement "
        f"produite par {len(failing_cells)}/{assessment['unique_functional_cells']} cellules "
        "fonctionnelles canal–perturbation sous le seuil. Distribution des multiplicités : "
        f"{multiplicity_summary}; elles proviennent des axes inactifs pour ce proxy "
        f"({inactive_axes}). Ce décompte ne constitue pas autant de preuves indépendantes, "
        "ni une observation de trace inutilisable.", "",
        "Portées : carte du seuil `formal_exact`, reconstruction `pipeline_verified`, "
        "trace et recours `unknown`.", "",
        "## Équation et cellules", "",
        f"`{assessment['formula']}` avec contestabilité configurée "
        f"`{assessment['configured_contestability_fraction']}`.", "",
        "| Canal | Perturbation | Seuil exact | Marge exacte | Proxy passe | Multiplicité |",
        "|---:|---:|---:|---:|---|---:|",
    ]
    for cell in assessment["cells"]:
        lines.append(
            f"| {cell['channel']} | {cell['perturbation']} | {cell['threshold_fraction']} | "
            f"{cell['margin_fraction']} | {'oui' if cell['proxy_passes'] else 'non'} | "
            f"{cell['multiplicity']} |"
        )
    lines.extend([
        "", "## Paire de représentations", "",
        "La représentation continue conserve la marge et la représentation binaire applique "
        "`indicator(marge >= 0)`. Elles ne discriminent pas deux modèles : le bit est une "
        "transformation déterministe qui perd la distance au seuil. Le gain d'évidence "
        "indépendante est nul.", "",
        relative_margin_summary + " Le proxy absolu peut néanmoins passer sous zéro.", "",
        "## Validité du construit", "",
        "Verdict : `proxy_substitution`. Aucun journal O3, motif, ressource saturée, "
        "voie de recours, correction, restitution ou contre-récit n'est généré. Le test "
        "porte sur un score configuré, non sur l'utilisabilité d'une trace.", "",
        f"Condition de retrait : {assessment['withdrawal_condition']}",
    ])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output", type=Path, default=ROOT.parent / "results" / "cct-sc-d10-001"
    )
    args = parser.parse_args()
    config = load_config()
    assessment = audit(config, execute(config))
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "contestability-audit.json").write_text(
        json.dumps(assessment, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    write_report(assessment, args.output / "contestability-audit.md")
    print(json.dumps(assessment, sort_keys=True))


if __name__ == "__main__":
    main()
