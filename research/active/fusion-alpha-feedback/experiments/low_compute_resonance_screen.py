#!/usr/bin/env python3
"""Écran CPU pour la non-équivalence locale M vs slowing-down.

Portée : modèle isotrope, normalisé en unités v_birth = n_alpha = m_alpha = 1.
Ne pas interpréter ce fichier comme un modèle de TAE ou de réacteur.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

PI = math.pi


def adaptive_simpson(function: Callable[[float], float], lower: float, upper: float,
                     tolerance: float = 1e-12, max_depth: int = 32) -> float:
    """Intégrale déterministe 1D sans dépendance scientifique externe."""

    def simpson(a: float, b: float, fa: float, fm: float, fb: float) -> float:
        return (b - a) * (fa + 4.0 * fm + fb) / 6.0

    midpoint = (lower + upper) / 2.0
    fa, fm, fb = function(lower), function(midpoint), function(upper)
    whole = simpson(lower, upper, fa, fm, fb)

    def recurse(a: float, b: float, fa_: float, fm_: float, fb_: float,
                estimate: float, epsilon: float, depth: int) -> float:
        mid = (a + b) / 2.0
        left_mid = (a + mid) / 2.0
        right_mid = (mid + b) / 2.0
        flm, frm = function(left_mid), function(right_mid)
        left = simpson(a, mid, fa_, flm, fm_)
        right = simpson(mid, b, fm_, frm, fb_)
        delta = left + right - estimate
        if depth <= 0 or abs(delta) <= 15.0 * epsilon:
            return left + right + delta / 15.0
        return (
            recurse(a, mid, fa_, flm, fm_, left, epsilon / 2.0, depth - 1)
            + recurse(mid, b, fm_, frm, fb_, right, epsilon / 2.0, depth - 1)
        )

    return recurse(lower, upper, fa, fm, fb, whole, tolerance, max_depth)


@dataclass(frozen=True)
class MomentMatchedPair:
    critical_ratio: float
    normalization: float
    second_moment: float
    thermal_speed_sq: float

    @classmethod
    def build(cls, critical_ratio: float) -> "MomentMatchedPair":
        if not 0.0 < critical_ratio < 1.0:
            raise ValueError("critical_ratio doit être strictement entre 0 et 1")

        c3 = critical_ratio ** 3
        integral_n = math.log((1.0 + c3) / c3) / 3.0
        normalization = 1.0 / (4.0 * PI * integral_n)
        integral_second = adaptive_simpson(
            lambda velocity: velocity ** 4 / (velocity ** 3 + c3), 0.0, 1.0
        )
        second_moment = integral_second / integral_n
        thermal_speed_sq = 2.0 * second_moment / 3.0
        return cls(critical_ratio, normalization, second_moment, thermal_speed_sq)

    def slowing_down(self, velocity: float) -> float:
        if not 0.0 <= velocity <= 1.0:
            return 0.0
        return self.normalization / (velocity ** 3 + self.critical_ratio ** 3)

    def maxwellian(self, velocity: float) -> float:
        vt2 = self.thermal_speed_sq
        return math.exp(-(velocity * velocity) / vt2) / (PI ** 1.5 * vt2 ** 1.5)

    def number_density_sd(self) -> float:
        return 4.0 * PI * adaptive_simpson(
            lambda velocity: velocity * velocity * self.slowing_down(velocity), 0.0, 1.0
        )

    def second_moment_sd(self) -> float:
        return 4.0 * PI * adaptive_simpson(
            lambda velocity: velocity ** 4 * self.slowing_down(velocity), 0.0, 1.0
        )

    def energy_slope_ratio(self, resonance_ratio: float) -> float:
        """|m dF_SD/dE| / |m dF_M/dE| à v_res/v_birth donné."""
        if not 0.0 < resonance_ratio < 1.0:
            raise ValueError("resonance_ratio doit être strictement entre 0 et 1")
        s = resonance_ratio
        c3 = self.critical_ratio ** 3
        slope_sd = 3.0 * self.normalization * s / (s ** 3 + c3) ** 2
        slope_m = 2.0 * self.maxwellian(s) / self.thermal_speed_sq
        return slope_sd / slope_m


def values(start: float, stop: float, count: int) -> list[float]:
    return [start + index * (stop - start) / (count - 1) for index in range(count)]


def write_report(output: Path, rows: list[dict[str, float]], scan: dict[str, object]) -> dict[str, object]:
    ratios = [row["slope_ratio"] for row in rows]
    min_row = min(rows, key=lambda row: row["slope_ratio"])
    max_row = max(rows, key=lambda row: row["slope_ratio"])
    factor_two = [row for row in rows if row["slope_ratio"] <= 0.5 or row["slope_ratio"] >= 2.0]
    summary: dict[str, object] = {
        "scope": "isotropic moment-matched F0 screen; not a TAE or reactor calculation",
        "scan": scan,
        "grid_points": len(rows),
        "ratio_min": min(ratios),
        "ratio_max": max(ratios),
        "min_location": min_row,
        "max_location": max_row,
        "factor_two_rows": len(factor_two),
        "interpretation": (
            "A factor-of-two flag identifies large local slope mismatch only. "
            "It does not establish a TAE-growth or fusion-gain change."
        ),
    }
    with (output / "summary.json").open("w", encoding="utf-8") as file:
        json.dump(summary, file, indent=2, sort_keys=True)
        file.write("\n")

    with (output / "report.md").open("w", encoding="utf-8") as file:
        file.write("# Écran léger M vs slowing-down\n\n")
        file.write("## Statut\n\n")
        file.write("Calcul analytique isotrope et apparié en moments. Il ne simule ni TAE, ni tokamak, ni réacteur.\n\n")
        file.write("## Résultat reproductible\n\n")
        file.write("- domaine : "
                   f"c=[{scan['critical_min']:.3f}, {scan['critical_max']:.3f}], "
                   f"s=[{scan['resonance_min']:.3f}, {scan['resonance_max']:.3f}]\n")
        file.write(f"- points de grille : {len(rows)}\n")
        file.write(f"- ratio minimal : {min(ratios):.6g} à c={min_row['critical_ratio']:.3f}, s={min_row['resonance_ratio']:.3f}\n")
        file.write(f"- ratio maximal : {max(ratios):.6g} à c={max_row['critical_ratio']:.3f}, s={max_row['resonance_ratio']:.3f}\n")
        file.write(f"- points avec écart local d'au moins un facteur deux : {len(factor_two)}/{len(rows)}\n\n")
        file.write("## Conclusion bornée\n\n")
        file.write("La sortie mesure une non-équivalence locale de pente, pas le signe d'un gain alpha. "
                   "Elle peut justifier ou non un calcul cinétique complet, mais ne le remplace pas.\n")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--points", type=int, default=17)
    parser.add_argument("--critical-min", type=float, default=0.05)
    parser.add_argument("--critical-max", type=float, default=0.95)
    parser.add_argument("--resonance-min", type=float, default=0.05)
    parser.add_argument("--resonance-max", type=float, default=0.95)
    parser.add_argument("--label", default="mathematical sweep")
    args = parser.parse_args()
    if args.points < 3:
        raise SystemExit("--points doit être >= 3")
    if not 0.0 < args.critical_min < args.critical_max < 1.0:
        raise SystemExit("les bornes critiques doivent vérifier 0 < min < max < 1")
    if not 0.0 < args.resonance_min < args.resonance_max < 1.0:
        raise SystemExit("les bornes de résonance doivent vérifier 0 < min < max < 1")

    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    critical_values = values(args.critical_min, args.critical_max, args.points)
    resonance_values = values(args.resonance_min, args.resonance_max, args.points)
    rows: list[dict[str, float]] = []
    for critical_ratio in critical_values:
        pair = MomentMatchedPair.build(critical_ratio)
        for resonance_ratio in resonance_values:
            rows.append({
                "critical_ratio": critical_ratio,
                "resonance_ratio": resonance_ratio,
                "second_moment": pair.second_moment,
                "thermal_speed_sq": pair.thermal_speed_sq,
                "slope_ratio": pair.energy_slope_ratio(resonance_ratio),
            })

    with (output / "grid.csv").open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    write_report(output, rows, {
        "label": args.label,
        "critical_min": args.critical_min,
        "critical_max": args.critical_max,
        "resonance_min": args.resonance_min,
        "resonance_max": args.resonance_max,
    })


if __name__ == "__main__":
    main()
