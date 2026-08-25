#!/usr/bin/env python3
"""Borne CPU ZOW/FOW pour un noyau local de gradient alpha.

Le modèle reprend la dépendance publiée en invariants de Fitzgerald et al.
(Nuclear Fusion 63, 112006, 2023, eq. 7) : le profil radial est évalué soit
au centre d'orbite ZOW, soit à un centre FOW qui dépend de l'énergie, du
moment magnétique et du signe de v_parallel.  Les deux fonds comparés sont :

* SD : slowing-down isotrope ;
* M  : Maxwellienne appariée en densité et second moment au même rhoC.

Le matching au même rhoC est une convention canonique explicitement choisie :
une Maxwellienne locale n'a pas automatiquement de cellule FOW.

L'écran ne produit ni croissance TAE ni gain fusion. Il reporte seulement le
zéro d'un *noyau local normalisé* inspiré de K = omega d_E F - n d_P F. Le K
physique est intégré sur les résonances avec un mode et des amortissements ;
ce zéro local ne constitue donc pas un seuil TAE. Sans profil, équilibre et
mode réels, eta* reste adimensionné.
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

from low_compute_resonance_screen import MomentMatchedPair, values


@lru_cache(maxsize=None)
def moment_pair(critical_ratio: float) -> MomentMatchedPair:
    """Réutilise les intégrales de moments à tous les pitchs et FOW d'un même c."""
    return MomentMatchedPair.build(critical_ratio)


@dataclass(frozen=True)
class FowThreshold:
    """Zéros locaux normalisés du noyau pour SD et M, ZOW et FOW."""

    critical_ratio: float
    resonance_ratio: float
    pitch_lambda: float
    orbit_shift: float
    branch: int
    amplitude_ratio: float
    eta_sd_zow: float
    eta_maxwell_zow: float
    eta_sd_fow: float
    eta_maxwell_fow: float

    @property
    def distribution_gap_zow(self) -> float:
        return abs(self.eta_sd_zow - self.eta_maxwell_zow)

    @property
    def distribution_gap_fow(self) -> float:
        return abs(self.eta_sd_fow - self.eta_maxwell_fow)

    @property
    def orbit_gap_sd(self) -> float:
        return abs(self.eta_sd_fow - self.eta_sd_zow)

    @property
    def orbit_gap_maxwell(self) -> float:
        return abs(self.eta_maxwell_fow - self.eta_maxwell_zow)

    @property
    def orbit_shift_exceeds_distribution_gap(self) -> bool:
        return self.orbit_gap_sd >= self.distribution_gap_zow

    @property
    def signed_interaction(self) -> float:
        """Interaction FOW×distribution dans ce modèle séparé.

        Elle doit être nulle ici : le décalage FOW est le même terme ajouté aux
        deux fonds, car vc ne dépend pas de rhoC et le matching est imposé au
        même rhoC. Cette identité est un résultat de *ce modèle*, pas une loi
        de tokamak.
        """
        return (
            (self.eta_sd_fow - self.eta_maxwell_fow)
            - (self.eta_sd_zow - self.eta_maxwell_zow)
        )


def thresholds(
    critical_ratio: float,
    resonance_ratio: float,
    pitch_lambda: float,
    orbit_shift: float,
    branch: int,
) -> FowThreshold:
    """Évalue l'écran à énergie W, moment μ et Pphi fixés.

    x=W/Ebirth=s².  Au point évalué, lambda=μB0/W. Lors de d/dW, μ reste
    fixe : il faut donc dériver sqrt(x-μB0/Ebirth), pas traiter lambda comme
    une constante. `orbit_shift` est delta/L_nalpha, non calibré à une machine.

    Le profil utilisé pour isoler le FOW est nalpha(rhoC) ∝ exp(-rhoC), avec
    rhoC = rho - sigma*delta*sqrt(x*(1-lambda)). Cela fait de FOW/ZOW une
    borne analytique : le code ne prétend pas fournir nalpha d'un réacteur.
    Ici, SD et M sont tous deux évalués à rhoC ; cette règle de matching
    canonique ne doit pas être confondue avec une dynamique d'orbite absente ou
    présente dans un solveur gyrocinétique.
    """
    if not 0.0 < critical_ratio < 1.0:
        raise ValueError("critical_ratio doit être strictement entre 0 et 1")
    if not 0.0 < resonance_ratio < 1.0:
        raise ValueError("resonance_ratio doit être strictement entre 0 et 1")
    if not 0.0 <= pitch_lambda < 1.0:
        raise ValueError("pitch_lambda doit vérifier 0 <= lambda < 1")
    if orbit_shift < 0.0:
        raise ValueError("orbit_shift doit être positif ou nul")
    if branch not in (-1, 1):
        raise ValueError("branch doit être -1 ou +1")

    c, s = critical_ratio, resonance_ratio
    x = s ** 2
    # ell=mu B0/Ebirth remains fixed under the energy derivative.
    ell = x * pitch_lambda
    parallel_energy = x - ell
    if parallel_energy <= 0.0:
        raise ValueError("point deeply trapped non admis par la borne FOW")

    pair = moment_pair(c)
    c3 = c ** 3
    # eta* is E*d_EF / d_rhoF in normalized coordinates.  With ZOW,
    # d_rho log n=-1, so eta* is the positive magnitude of the logarithmic
    # energy slope. It only zeros this local proxy; it is not a TAE threshold.
    eta_sd_zow = 1.5 * s ** 3 / (s ** 3 + c3)
    eta_maxwell_zow = s ** 2 / pair.thermal_speed_sq

    orbit_coordinate_shift = branch * orbit_shift * math.sqrt(parallel_energy)
    amplitude_ratio = math.exp(orbit_coordinate_shift)
    # x*d_x[-rhoC] at (mu,Pphi) fixed. It changes the logarithmic energy
    # derivative and therefore translates both distribution thresholds.
    fow_energy_shift = branch * orbit_shift * x / (2.0 * math.sqrt(parallel_energy))
    eta_sd_fow = eta_sd_zow - fow_energy_shift
    eta_maxwell_fow = eta_maxwell_zow - fow_energy_shift
    return FowThreshold(
        c,
        s,
        pitch_lambda,
        orbit_shift,
        branch,
        amplitude_ratio,
        eta_sd_zow,
        eta_maxwell_zow,
        eta_sd_fow,
        eta_maxwell_fow,
    )


def as_row(result: FowThreshold) -> dict[str, float | int | bool]:
    return {
        "critical_ratio": result.critical_ratio,
        "resonance_ratio": result.resonance_ratio,
        "pitch_lambda": result.pitch_lambda,
        "orbit_shift": result.orbit_shift,
        "branch": result.branch,
        "amplitude_ratio_fow_over_zow": result.amplitude_ratio,
        "eta_sd_zow": result.eta_sd_zow,
        "eta_maxwell_zow": result.eta_maxwell_zow,
        "eta_sd_fow": result.eta_sd_fow,
        "eta_maxwell_fow": result.eta_maxwell_fow,
        "distribution_gap_zow": result.distribution_gap_zow,
        "distribution_gap_fow": result.distribution_gap_fow,
        "orbit_gap_sd": result.orbit_gap_sd,
        "orbit_gap_maxwell": result.orbit_gap_maxwell,
        "orbit_shift_exceeds_distribution_gap": result.orbit_shift_exceeds_distribution_gap,
        "signed_interaction": result.signed_interaction,
    }


def write_report(output: Path, rows: list[dict[str, float | int | bool]], scan: dict[str, object]) -> dict[str, object]:
    gap_zow = [float(row["distribution_gap_zow"]) for row in rows]
    gap_fow = [float(row["distribution_gap_fow"]) for row in rows]
    orbit_gap = [float(row["orbit_gap_sd"]) for row in rows]
    amplitudes = [float(row["amplitude_ratio_fow_over_zow"]) for row in rows]
    dominant = sum(bool(row["orbit_shift_exceeds_distribution_gap"]) for row in rows)
    interactions = [abs(float(row["signed_interaction"])) for row in rows]
    max_orbit_row = max(rows, key=lambda row: float(row["orbit_gap_sd"]))
    max_distribution_row = max(rows, key=lambda row: float(row["distribution_gap_zow"]))
    summary: dict[str, object] = {
        "scope": (
            "dimensionless ZOW/FOW representation bound in (E, mu, Pphi); "
            "not an integrated TAE, tokamak, or reactor calculation"
        ),
        "scan": scan,
        "grid_points": len(rows),
        "distribution_gap_zow_min": min(gap_zow),
        "distribution_gap_zow_max": max(gap_zow),
        "distribution_gap_fow_min": min(gap_fow),
        "distribution_gap_fow_max": max(gap_fow),
        "orbit_gap_sd_max": max(orbit_gap),
        "orbit_gap_sd_median": statistics.median(orbit_gap),
        "amplitude_ratio_min": min(amplitudes),
        "amplitude_ratio_max": max(amplitudes),
        "orbit_shift_exceeds_distribution_gap_rows": dominant,
        "interaction_abs_max": max(interactions),
        "max_orbit_gap_location": max_orbit_row,
        "max_distribution_gap_location": max_distribution_row,
        "interpretation": (
            "In this separable constant-vc construction, FOW shifts both SD and M "
            "by the same local term, so their interaction is identically zero. A "
            "large absolute FOW shift is therefore not evidence that FOW changes "
            "the SD/M discrimination."
        ),
    }
    with (output / "summary.json").open("w", encoding="utf-8") as file:
        json.dump(summary, file, indent=2, sort_keys=True)
        file.write("\n")
    with (output / "report.md").open("w", encoding="utf-8") as file:
        file.write("# Borne CPU ZOW/FOW : zéro local d'un noyau alpha\n\n")
        file.write("## Statut\n\n")
        file.write(
            "Écran en invariants d'orbite dérivé d'une forme publiée. Le matching "
            "SD/M est imposé au même rhoC par convention canonique. Il ne fournit "
            "ni un taux de croissance TAE ni un verdict sur la fusion.\n\n"
        )
        file.write("## Résultat reproductible\n\n")
        file.write(
            f"- c : [{scan['critical_min']:.3f}, {scan['critical_max']:.3f}] ; "
            f"s : [{scan['resonance_min']:.3f}, {scan['resonance_max']:.3f}] ; "
            f"lambda : [{scan['pitch_min']:.3f}, {scan['pitch_max']:.3f}] ; "
            f"delta/Ln : [{scan['orbit_min']:.3f}, {scan['orbit_max']:.3f}]\n"
        )
        file.write(f"- points : {len(rows)}\n")
        file.write(
            f"- écart SD/M du zéro local ZOW : {min(gap_zow):.6g} à {max(gap_zow):.6g}\n"
        )
        file.write(
            f"- translation FOW maximale du zéro local SD : {max(orbit_gap):.6g}\n"
        )
        file.write(
            f"- décalage FOW absolu ≥ écart SD/M : {dominant}/{len(rows)} points\n"
        )
        file.write(
            f"- changement d'amplitude FOW/ZOW : {min(amplitudes):.6g} à {max(amplitudes):.6g}\n\n"
        )
        file.write(
            f"- interaction SD/M × FOW maximale : {max(interactions):.6g} (nulle par construction)\n\n"
        )
        file.write("## Conclusion bornée\n\n")
        file.write(
            "Le balayage ne peut pas attribuer un delta/Ln à SPARC, ITER ou une autre machine. "
            "Surtout, le test s'effondre comme source d'interaction nouvelle : dans cette "
            "construction, FOW translate SD et M de façon identique. Une interaction physique "
            "exigerait au minimum des profils vc/Te, un matching canonique défini et une "
            "pondération de mode.\n"
        )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--points", type=int, default=11)
    parser.add_argument("--pitch-points", type=int, default=11)
    parser.add_argument("--orbit-points", type=int, default=11)
    parser.add_argument("--critical-min", type=float, default=0.31)
    parser.add_argument("--critical-max", type=float, default=0.53)
    parser.add_argument("--resonance-min", type=float, default=0.50)
    parser.add_argument("--resonance-max", type=float, default=0.65)
    parser.add_argument("--pitch-min", type=float, default=0.0)
    parser.add_argument("--pitch-max", type=float, default=0.90)
    parser.add_argument("--orbit-min", type=float, default=0.0)
    parser.add_argument("--orbit-max", type=float, default=1.0)
    parser.add_argument("--label", default="dimensionless ZOW/FOW sensitivity, not a device fit")
    args = parser.parse_args()
    if min(args.points, args.pitch_points, args.orbit_points) < 3:
        raise SystemExit("tous les nombres de points doivent être >= 3")
    if not 0.0 < args.critical_min < args.critical_max < 1.0:
        raise SystemExit("les bornes critiques doivent vérifier 0 < min < max < 1")
    if not 0.0 < args.resonance_min < args.resonance_max < 1.0:
        raise SystemExit("les bornes de résonance doivent vérifier 0 < min < max < 1")
    if not 0.0 <= args.pitch_min < args.pitch_max < 1.0:
        raise SystemExit("les bornes pitch doivent vérifier 0 <= min < max < 1")
    if not 0.0 <= args.orbit_min < args.orbit_max:
        raise SystemExit("les bornes d'orbite doivent vérifier 0 <= min < max")

    rows = [
        as_row(thresholds(c, s, pitch, orbit, branch))
        for c in values(args.critical_min, args.critical_max, args.points)
        for s in values(args.resonance_min, args.resonance_max, args.points)
        for pitch in values(args.pitch_min, args.pitch_max, args.pitch_points)
        for orbit in values(args.orbit_min, args.orbit_max, args.orbit_points)
        for branch in (-1, 1)
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
            "pitch_min": args.pitch_min,
            "pitch_max": args.pitch_max,
            "orbit_min": args.orbit_min,
            "orbit_max": args.orbit_max,
        },
    )


if __name__ == "__main__":
    main()
