#!/usr/bin/env python3
"""Écran CPU local des termes énergie–rayon d'un fond alpha.

Portée volontairement étroite
------------------------------
La revue de Todo (2018), eqs. 11--13, rappelle que le drive résonant d'un
mode d'Alfvén dépend à la fois de la dérivée en énergie et de la dérivée en
moment toroidal canonique (approchée ici par une dérivée radiale locale).

Ce fichier ne calcule ni une fréquence ni une croissance de TAE. Il teste
seulement si un fond de ralentissement isotrope et une Maxwellienne appariée
en densité + second moment restent interchangeables pour ces deux dérivées.
La coordonnée radiale et le coefficient qui les combine sont normalisés : ils
ne sont pas les paramètres d'un tokamak donné.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from low_compute_resonance_screen import MomentMatchedPair, adaptive_simpson, values


@dataclass(frozen=True)
class LocalDerivativePair:
    """Dérivées locales de deux fonds appariés à un point de phase."""

    critical_ratio: float
    resonance_ratio: float
    gradient_ratio: float
    sd_energy: float
    maxwell_energy: float
    sd_radial: float
    maxwell_radial: float

    @property
    def energy_ratio(self) -> float:
        return abs(self.sd_energy / self.maxwell_energy)

    @property
    def radial_ratio(self) -> float:
        return abs(self.sd_radial / self.maxwell_radial)

    @property
    def radial_sign_agrees(self) -> bool:
        return self.sd_radial * self.maxwell_radial > 0.0

    @property
    def lambda_critical_sd(self) -> float:
        """Valeur de λ annulant E∂E F + λ∂ρF pour SD, en unités normalisées."""
        return -self.sd_energy / self.sd_radial

    @property
    def lambda_critical_maxwell(self) -> float:
        """Valeur analogue pour la Maxwellienne appariée."""
        return -self.maxwell_energy / self.maxwell_radial

    @property
    def cancellation_gap(self) -> float:
        """Écart des coefficients de compensation, sans prétention géométrique."""
        return abs(self.lambda_critical_sd - self.lambda_critical_maxwell)


@lru_cache(maxsize=None)
def log_normalization_derivative(critical_ratio: float) -> float:
    """d(log A)/dc pour A/(v³+c³), A fixant n=1."""
    c = critical_ratio
    integral_number = math.log((1.0 + c ** 3) / c ** 3) / 3.0
    return 1.0 / (c * (1.0 + c ** 3) * integral_number)


@lru_cache(maxsize=None)
def log_second_moment_derivative(critical_ratio: float) -> float:
    """d(log <v²>_SD)/dc, par différentiation sous l'intégrale."""
    c = critical_ratio
    c3 = c ** 3
    integral_number = math.log((1.0 + c3) / c3) / 3.0
    integral_second = adaptive_simpson(
        lambda velocity: velocity ** 4 / (velocity ** 3 + c3), 0.0, 1.0
    )
    derivative_number = adaptive_simpson(
        lambda velocity: -3.0 * c ** 2 * velocity ** 2 / (velocity ** 3 + c3) ** 2,
        0.0,
        1.0,
    )
    derivative_second = adaptive_simpson(
        lambda velocity: -3.0 * c ** 2 * velocity ** 4 / (velocity ** 3 + c3) ** 2,
        0.0,
        1.0,
    )
    second_moment = integral_second / integral_number
    derivative_moment = (
        derivative_second * integral_number - integral_second * derivative_number
    ) / integral_number ** 2
    return derivative_moment / second_moment


@lru_cache(maxsize=None)
def moment_pair(critical_ratio: float) -> MomentMatchedPair:
    """Évite de refaire les mêmes intégrales sur tous les s et k d'un c."""
    return MomentMatchedPair.build(critical_ratio)


def local_derivatives(
    critical_ratio: float, resonance_ratio: float, gradient_ratio: float
) -> LocalDerivativePair:
    """Construit les dérivées au point (c, s) pour une famille locale déclarée.

    La famille est nα(ρ)=nα(0) exp(-ρ), c(ρ)=c(0) exp(-kρ), avec
    k=gradient_ratio. Ainsi k>=0 représente des profils nα et c co-décroissants
    vers le bord. La Maxwellienne est réappariée à chaque ρ en nombre et
    second moment, ce qui lui donne le meilleur cas local raisonnable.

    La dérivée énergie est E ∂E F = (v/2) ∂vF pour mα=v_birth=1.
    La dérivée radiale est ∂ρF à énergie fixée. Le coefficient λ qui les
    combine n'est intentionnellement pas assimilé à n/ω d'un vrai tokamak.
    """
    if not 0.0 < resonance_ratio < 1.0:
        raise ValueError("resonance_ratio doit être strictement entre 0 et 1")
    if gradient_ratio < 0.0:
        raise ValueError("gradient_ratio doit être positif ou nul pour ce balayage co-décroissant")

    c = critical_ratio
    s = resonance_ratio
    pair = moment_pair(c)
    c3 = c ** 3
    sd_value = pair.slowing_down(s)
    maxwell_value = pair.maxwellian(s)

    # E∂E F, à nombre local fixe.
    sd_energy = -1.5 * pair.normalization * s ** 3 / (s ** 3 + c3) ** 2
    maxwell_energy = -(s ** 2 / pair.thermal_speed_sq) * maxwell_value

    # ∂ρ log n=-1 and ∂ρ log c=-k.  Both distributions retain equal n and <v²>
    # at every radius, not just at the reference point.
    dlog_sd_dc = log_normalization_derivative(c) - 3.0 * c ** 2 / (s ** 3 + c3)
    dlog_maxwell_dc = (
        s ** 2 / pair.thermal_speed_sq - 1.5
    ) * log_second_moment_derivative(c)
    sd_radial = sd_value * (-1.0 - gradient_ratio * c * dlog_sd_dc)
    maxwell_radial = maxwell_value * (
        -1.0 - gradient_ratio * c * dlog_maxwell_dc
    )
    return LocalDerivativePair(
        critical_ratio,
        resonance_ratio,
        gradient_ratio,
        sd_energy,
        maxwell_energy,
        sd_radial,
        maxwell_radial,
    )


def as_row(pair: LocalDerivativePair) -> dict[str, float | bool]:
    return {
        "critical_ratio": pair.critical_ratio,
        "resonance_ratio": pair.resonance_ratio,
        "gradient_ratio": pair.gradient_ratio,
        "energy_ratio": pair.energy_ratio,
        "radial_ratio": pair.radial_ratio,
        "radial_sign_agrees": pair.radial_sign_agrees,
        "lambda_critical_sd": pair.lambda_critical_sd,
        "lambda_critical_maxwell": pair.lambda_critical_maxwell,
        "cancellation_gap": pair.cancellation_gap,
    }


def write_report(output: Path, rows: list[dict[str, float | bool]], scan: dict[str, object]) -> dict[str, object]:
    radial_ratios = [float(row["radial_ratio"]) for row in rows]
    gaps = [float(row["cancellation_gap"]) for row in rows]
    min_ratio_row = min(rows, key=lambda row: float(row["radial_ratio"]))
    max_ratio_row = max(rows, key=lambda row: float(row["radial_ratio"]))
    max_gap_row = max(rows, key=lambda row: float(row["cancellation_gap"]))
    sign_disagreements = sum(not bool(row["radial_sign_agrees"]) for row in rows)
    summary: dict[str, object] = {
        "scope": (
            "local energy-radial derivative screen for an isotropic alpha F0; "
            "not a TAE, tokamak, or reactor calculation"
        ),
        "scan": scan,
        "grid_points": len(rows),
        "radial_ratio_min": min(radial_ratios),
        "radial_ratio_max": max(radial_ratios),
        "radial_ratio_median": statistics.median(radial_ratios),
        "min_radial_ratio_location": min_ratio_row,
        "max_radial_ratio_location": max_ratio_row,
        "radial_sign_disagreements": sign_disagreements,
        "cancellation_gap_max": max(gaps),
        "cancellation_gap_median": statistics.median(gaps),
        "max_cancellation_gap_location": max_gap_row,
        "interpretation": (
            "The cancellation gap is a normalized uncertainty interval in the relative "
            "energy/radial weighting. It does not identify a real mode or a real value of λ."
        ),
    }
    with (output / "summary.json").open("w", encoding="utf-8") as file:
        json.dump(summary, file, indent=2, sort_keys=True)
        file.write("\n")
    with (output / "report.md").open("w", encoding="utf-8") as file:
        file.write("# Écran léger énergie–rayon : Maxwellienne vs ralentissement\n\n")
        file.write("## Statut\n\n")
        file.write(
            "Calcul analytique local. Il ne résout ni une résonance complète, ni la géométrie, "
            "ni le taux de croissance d'un TAE.\n\n"
        )
        file.write("## Convention testée\n\n")
        file.write(
            "Les deux fonds ont la même densité et le même second moment à chaque rayon. "
            "Leur densité alpha et leur vitesse critique décroissent ensemble vers le bord ; "
            "`k` est le rapport adimensionné de leurs gradients logarithmiques.\n\n"
        )
        file.write("## Résultat reproductible\n\n")
        file.write(
            f"- c : [{scan['critical_min']:.3f}, {scan['critical_max']:.3f}] ; "
            f"s : [{scan['resonance_min']:.3f}, {scan['resonance_max']:.3f}] ; "
            f"k : [{scan['gradient_min']:.3f}, {scan['gradient_max']:.3f}]\n"
        )
        file.write(f"- points : {len(rows)}\n")
        file.write(
            f"- |∂ρF_SD|/|∂ρF_M| : {min(radial_ratios):.6g} à {max(radial_ratios):.6g}\n"
        )
        file.write(f"- désaccords de signe de ∂ρF : {sign_disagreements}/{len(rows)}\n")
        file.write(
            f"- écart maximal de coefficient de compensation normalisé : {max(gaps):.6g}\n\n"
        )
        file.write("## Conclusion bornée\n\n")
        file.write(
            "Dans cette famille locale co-décroissante, l'ajout du gradient radial ne rend pas "
            "les deux fonds identiques. L'absence éventuelle de désaccord de signe dans ce "
            "balayage ne prouve pas un même drive de TAE : le coefficient géométrique réel, "
            "le pitch, les orbites et l'amortissement restent absents.\n"
        )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--points", type=int, default=17)
    parser.add_argument("--gradient-points", type=int, default=17)
    parser.add_argument("--critical-min", type=float, default=0.31)
    parser.add_argument("--critical-max", type=float, default=0.53)
    parser.add_argument("--resonance-min", type=float, default=0.50)
    parser.add_argument("--resonance-max", type=float, default=0.65)
    parser.add_argument("--gradient-min", type=float, default=0.0)
    parser.add_argument("--gradient-max", type=float, default=2.0)
    parser.add_argument("--label", default="co-decreasing local-gradient stress window, not a device fit")
    args = parser.parse_args()
    if args.points < 3 or args.gradient_points < 3:
        raise SystemExit("les nombres de points doivent être >= 3")
    if not 0.0 < args.critical_min < args.critical_max < 1.0:
        raise SystemExit("les bornes critiques doivent vérifier 0 < min < max < 1")
    if not 0.0 < args.resonance_min < args.resonance_max < 1.0:
        raise SystemExit("les bornes de résonance doivent vérifier 0 < min < max < 1")
    if not 0.0 <= args.gradient_min < args.gradient_max:
        raise SystemExit("les bornes de gradient doivent vérifier 0 <= min < max")

    rows = [
        as_row(local_derivatives(c, s, k))
        for c in values(args.critical_min, args.critical_max, args.points)
        for s in values(args.resonance_min, args.resonance_max, args.points)
        for k in values(args.gradient_min, args.gradient_max, args.gradient_points)
    ]
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    with (output / "grid.csv").open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    write_report(
        output,
        rows,
        {
            "label": args.label,
            "critical_min": args.critical_min,
            "critical_max": args.critical_max,
            "resonance_min": args.resonance_min,
            "resonance_max": args.resonance_max,
            "gradient_min": args.gradient_min,
            "gradient_max": args.gradient_max,
        },
    )


if __name__ == "__main__":
    main()
