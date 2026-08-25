#!/usr/bin/env python3
"""Run a declared fictional SD/M x ZOW/FOW linear-drive matrix."""

from __future__ import annotations

import argparse
from bisect import bisect_left
from hashlib import sha256
import json
import math
from pathlib import Path
from typing import Callable, Mapping, Sequence

from f0_matching import (
    build_four_backgrounds,
    density,
    mean_energy,
    total_density,
)


ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "fictive_tae_matrix_v0.2.json"


def load_config(path: Path = CONFIG_PATH) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def content_hash(value: object) -> str:
    serialized = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return f"sha256:{sha256(serialized.encode('utf-8')).hexdigest()}"


def midpoint_grid(lower: float, upper: float, points: int) -> tuple[list[float], list[float]]:
    if points < 3 or not lower < upper:
        raise ValueError("a midpoint grid requires at least three points and ordered bounds")
    width = (upper - lower) / points
    return [lower + (index + 0.5) * width for index in range(points)], [width] * points


def generate_source(
    config: Mapping[str, object],
    radii: Sequence[float],
    pitches: Sequence[float],
    energies: Sequence[float],
    radial_weights: Sequence[float],
    pitch_weights: Sequence[float],
    energy_weights: Sequence[float],
) -> list[list[list[float]]]:
    generator = config["generator"]
    output = []
    for radius, radial_weight in zip(radii, radial_weights):
        radial = []
        critical = float(generator["critical_energy_base"]) * (
            1.0 + float(generator["critical_energy_radial_slope"]) * radius
        )
        radial_density = math.exp(-float(generator["density_decay"]) * radius)
        for pitch, pitch_weight in zip(pitches, pitch_weights):
            pitch_density = 1.0 + 0.08 * pitch * pitch
            cell = []
            for energy, energy_weight in zip(energies, energy_weights):
                slowing = math.sqrt(energy) / (energy ** 1.5 + critical ** 1.5)
                cutoff = math.exp(-((energy / float(generator["birth_cutoff_energy"])) ** 8))
                cell.append(
                    radial_density
                    * pitch_density
                    * slowing
                    * cutoff
                    * radial_weight
                    * pitch_weight
                    * energy_weight
                )
            radial.append(cell)
        output.append(radial)
    normalizer = total_density(output)
    return [
        [[value / normalizer for value in cell] for cell in radial]
        for radial in output
    ]


def orbit_map(
    radii: Sequence[float],
    pitches: Sequence[float],
    energies: Sequence[float],
    operator: Mapping[str, object],
) -> list[list[list[list[float]]]]:
    radius_count = len(radii)
    energy_max = max(energies)
    kind = str(operator["kind"])
    output = []
    for pitch in pitches:
        pitch_slice = []
        for energy in energies:
            matrix = [[0.0 for _ in radii] for _ in radii]
            direction = 1 if pitch >= 0 else -1
            factor = math.sqrt(energy / energy_max) * (0.55 + 0.45 * (1.0 - abs(pitch)))
            for source, source_radius in enumerate(radii):
                if kind == "adjacent_cell_probability":
                    shift = min(0.45, max(0.0, float(operator["strength"]) * factor))
                    destination = source + direction
                    if destination < 0 or destination >= radius_count:
                        destination = source - direction
                    matrix[source][source] += 1.0 - shift
                    matrix[destination][source] += shift
                elif kind == "fixed_radial_displacement_linear_interpolation":
                    displacement = direction * float(operator["maximum_displacement"]) * factor
                    target = min(max(source_radius + displacement, radii[0]), radii[-1])
                    if target <= radii[0]:
                        matrix[0][source] = 1.0
                    elif target >= radii[-1]:
                        matrix[-1][source] = 1.0
                    else:
                        right = bisect_left(radii, target)
                        left = right - 1
                        right_weight = (target - radii[left]) / (radii[right] - radii[left])
                        matrix[left][source] = 1.0 - right_weight
                        matrix[right][source] = right_weight
                else:
                    raise ValueError(f"unsupported fictional orbit operator: {kind}")
            pitch_slice.append(matrix)
        output.append(pitch_slice)
    return output


def identity_orbit_map(
    radii: Sequence[float], pitches: Sequence[float], energies: Sequence[float]
) -> list[list[list[list[float]]]]:
    return [
        [
            [[float(destination == source) for source in range(len(radii))] for destination in range(len(radii))]
            for _energy in energies
        ]
        for _pitch in pitches
    ]


def kernel_function(
    parameters: Mapping[str, object], energy_max: float
) -> Callable[[float, float, float], float]:
    center_r = float(parameters["radial_center"])
    width_r = float(parameters["radial_width"])
    center_e = float(parameters["energy_center"])
    width_e = float(parameters["energy_width"])
    tail_weight = float(parameters["tail_weight"])

    def kernel(radius: float, pitch: float, energy: float) -> float:
        radial = math.exp(-((radius - center_r) / width_r) ** 2)
        pitch_factor = 1.0 + 0.18 * pitch
        resonant = math.exp(-((energy - center_e) / width_e) ** 2)
        tail = math.exp(-((energy - (center_e + 1.6 * width_e)) / (1.35 * width_e)) ** 2)
        return radial * pitch_factor * (resonant - tail_weight * tail * energy / energy_max)

    return kernel


def drive(
    background: Sequence[Sequence[Sequence[float]]],
    radii: Sequence[float],
    pitches: Sequence[float],
    energies: Sequence[float],
    kernel: Callable[[float, float, float], float],
) -> float:
    return sum(
        background[radius][pitch][energy] * kernel(r_value, p_value, e_value)
        for radius, r_value in enumerate(radii)
        for pitch, p_value in enumerate(pitches)
        for energy, e_value in enumerate(energies)
    )


def _maximum_matching_error(
    sd: Sequence[Sequence[Sequence[float]]],
    matched: Sequence[Sequence[Sequence[float]]],
    energies: Sequence[float],
) -> tuple[float, float]:
    density_error = energy_error = 0.0
    for sd_radius, matched_radius in zip(sd, matched):
        for sd_cell, matched_cell in zip(sd_radius, matched_radius):
            density_error = max(density_error, abs(density(sd_cell) - density(matched_cell)))
            energy_error = max(
                energy_error,
                abs(mean_energy(sd_cell, energies) - mean_energy(matched_cell, energies)),
            )
    return density_error, energy_error


def run_level(
    config: Mapping[str, object], level_name: str, level: Mapping[str, object]
) -> dict[str, object]:
    generator = config["generator"]
    radii, radial_weights = midpoint_grid(*map(float, generator["radius_range"]), int(level["radius_points"]))
    pitches, pitch_weights = midpoint_grid(*map(float, generator["pitch_range"]), int(level["pitch_points"]))
    energies, energy_weights = midpoint_grid(*map(float, generator["energy_range"]), int(level["energy_points"]))
    quadrature = {
        "representation": "cell_mass",
        "jacobian_applied": True,
        "radial_weights": radial_weights,
        "pitch_weights": pitch_weights,
        "energy_weights": energy_weights,
    }
    units = {
        "radius": "normalized_radius",
        "pitch": "dimensionless_pitch",
        "energy": "normalized_birth_energy",
        "cell_mass": "normalized_alpha_number",
    }
    source = generate_source(
        config, radii, pitches, energies,
        radial_weights, pitch_weights, energy_weights,
    )
    orbital = orbit_map(radii, pitches, energies, generator["orbit_operator"])
    built = build_four_backgrounds(
        source, energies, orbital,
        source_id=f"declared-fictional-source:{config['id']}:{level_name}",
        orbit_operator_id=(
            f"{generator['orbit_operator']['kind']}:{config['id']}:{level_name}"
        ),
        radius_grid=radii,
        pitch_grid=pitches,
        units=units,
        quadrature=quadrature,
    )
    identity = build_four_backgrounds(
        source, energies, identity_orbit_map(radii, pitches, energies),
        source_id=f"declared-fictional-source:{config['id']}:{level_name}",
        orbit_operator_id=f"identity:{config['id']}:{level_name}",
        radius_grid=radii,
        pitch_grid=pitches,
        units=units,
        quadrature=quadrature,
    )
    backgrounds = built["backgrounds"]
    density_error, energy_error = _maximum_matching_error(
        backgrounds["sd_zow"], backgrounds["m_zow"], energies
    )
    conservation_error = max(
        abs(total_density(backgrounds["sd_zow"]) - total_density(backgrounds["sd_fow"])),
        abs(total_density(backgrounds["m_zow"]) - total_density(backgrounds["m_fow"])),
    )
    identity_exact = (
        identity["backgrounds"]["sd_zow"] == identity["backgrounds"]["sd_fow"]
        and identity["backgrounds"]["m_zow"] == identity["backgrounds"]["m_fow"]
    )

    kernel_results = {}
    for kernel_name, parameters in config["mode_kernels"].items():
        kernel = kernel_function(parameters, max(energies))
        values = {
            name: drive(background, radii, pitches, energies, kernel)
            for name, background in backgrounds.items()
        }
        interaction = (
            values["sd_fow"] - values["sd_zow"]
            - values["m_fow"] + values["m_zow"]
        )
        kernel_results[kernel_name] = {
            "drives": values,
            "shape_gap_zow": values["sd_zow"] - values["m_zow"],
            "shape_gap_fow": values["sd_fow"] - values["m_fow"],
            "interaction": interaction,
            "normalized_interaction": interaction / max(abs(value) for value in values.values()),
        }

    uniform = lambda _r, _p, _e: 1.0
    moment = lambda _r, _p, energy: 1.0 + 0.07 * energy
    uniform_values = [drive(background, radii, pitches, energies, uniform) for background in backgrounds.values()]
    moment_values = [drive(background, radii, pitches, energies, moment) for background in backgrounds.values()]
    linear_kernel = kernel_function(next(iter(config["mode_kernels"].values())), max(energies))
    linear_background = [
        [[2.0 * value for value in cell] for cell in radial]
        for radial in backgrounds["sd_fow"]
    ]
    linearity_error = abs(
        drive(linear_background, radii, pitches, energies, linear_kernel)
        - 2.0 * drive(backgrounds["sd_fow"], radii, pitches, energies, linear_kernel)
    )
    return {
        "level": level_name,
        "grid": {
            "radius_points": len(radii),
            "pitch_points": len(pitches),
            "energy_points": len(energies),
            "radius_hash": content_hash(radii),
            "pitch_hash": content_hash(pitches),
            "energy_hash": content_hash(energies),
        },
        "orbit_operator": dict(generator["orbit_operator"]),
        "metadata": built["metadata"],
        "background_hashes": {
            name: content_hash(background) for name, background in backgrounds.items()
        },
        "source_total_density": total_density(source),
        "controls": {
            "matching_density_max_abs_error": density_error,
            "matching_mean_energy_max_abs_error": energy_error,
            "orbit_conservation_max_abs_error": conservation_error,
            "identity_exact": identity_exact,
            "uniform_kernel_spread": max(uniform_values) - min(uniform_values),
            "affine_moment_kernel_spread": max(moment_values) - min(moment_values),
            "linearity_abs_error": linearity_error,
        },
        "kernels": kernel_results,
    }


def execute(config: Mapping[str, object]) -> dict[str, object]:
    levels = {
        name: run_level(config, name, level)
        for name, level in config["grid_levels"].items()
    }
    decision = config["decision"]
    zero = float(decision["numerical_zero_absolute"])
    tolerance = float(decision["refinement_relative_tolerance"])
    stable = []
    refinements = {}
    fine = levels["fine"]
    reference = levels["reference"]
    for kernel_name in config["mode_kernels"]:
        fine_value = fine["kernels"][kernel_name]["normalized_interaction"]
        reference_value = reference["kernels"][kernel_name]["normalized_interaction"]
        relative_change = abs(reference_value - fine_value) / max(abs(reference_value), zero)
        same_sign = reference_value * fine_value > 0
        is_stable = abs(reference_value) > zero and same_sign and relative_change <= tolerance
        stable.append(kernel_name) if is_stable else None
        refinements[kernel_name] = {
            "coarse": levels["coarse"]["kernels"][kernel_name]["normalized_interaction"],
            "fine": fine_value,
            "reference": reference_value,
            "fine_to_reference_relative_change": relative_change,
            "same_sign_fine_reference": same_sign,
            "stable_nonzero": is_stable,
        }

    control_tolerance = 1e-9
    control_failures = []
    for name, level in levels.items():
        controls = level["controls"]
        if not level["metadata"]["provenance_contract_complete"]:
            control_failures.append(f"{name}:provenance")
        if not controls["identity_exact"]:
            control_failures.append(f"{name}:identity")
        for field in (
            "matching_density_max_abs_error",
            "matching_mean_energy_max_abs_error",
            "orbit_conservation_max_abs_error",
            "uniform_kernel_spread",
            "affine_moment_kernel_spread",
            "linearity_abs_error",
        ):
            if controls[field] > control_tolerance:
                control_failures.append(f"{name}:{field}")

    reference_nonzero = [
        name for name in config["mode_kernels"]
        if abs(reference["kernels"][name]["normalized_interaction"]) > zero
    ]
    if control_failures:
        verdict = "pipeline_invalid"
    elif len(stable) >= int(decision["minimum_stable_kernels"]):
        verdict = "shape_orbit_interaction_model_internal"
    elif not reference_nonzero:
        verdict = "shape_only_no_orbit_interaction"
    else:
        verdict = "inconclusive_refinement"
    return {
        "protocol": config["id"],
        "protocol_status": config["protocol_status"],
        "protocol_status_basis": "self_declared_in_config_no_independent_temporal_lock",
        "scope": {
            "fictional_linear_drive": "model_internal",
            "matching_provenance_reconstruction": "pipeline_verified",
        },
        "unsupported_claims": [
            "tae_stability",
            "alpha_transport",
            "reactor_relevance",
        ],
        "generator": config["generator"],
        "grid_levels": config["grid_levels"],
        "mode_kernels": config["mode_kernels"],
        "rival_predictions": config["rival_predictions"],
        "declared_invariants": config["declared_invariants"],
        "classification": {
            "verdict": verdict,
            "stable_nonzero_kernels": stable,
            "reference_nonzero_kernels": reference_nonzero,
            "control_failures": control_failures,
            "refinement": refinements,
        },
        "levels": levels,
        "protocol_effect": config["protocol_effect"],
        "withdrawal_condition": config["withdrawal_condition"],
    }


def write_report(result: Mapping[str, object], path: Path) -> None:
    classification = result["classification"]
    reference = result["levels"]["reference"]
    lines = [
        f"# {result['protocol']} — matrice fictive SD/M × ZOW/FOW", "",
        f"Statut temporel : `{result['protocol_status']}` selon la déclaration du "
        "fichier de configuration; aucun verrou temporel indépendant n'est établi.", "",
        "## Conclusion", "",
        f"Verdict : `{classification['verdict']}`. Noyaux non nuls et stables : "
        + (", ".join(f"`{name}`" for name in classification["stable_nonzero_kernels"]) or "aucun")
        + ".", "",
        "Le résultat porte sur une fonctionnelle linéaire fictive. Il ne constitue ni un "
        "taux de croissance TAE, ni une stabilité, ni un transport alpha.", "",
        "## Matrice de référence", "",
        "| Noyau | Drive SD ZOW | Drive M ZOW | Drive SD FOW | Drive M FOW | Interaction normalisée |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for name, item in reference["kernels"].items():
        drives = item["drives"]
        lines.append(
            f"| {name} | {drives['sd_zow']:.9g} | {drives['m_zow']:.9g} | "
            f"{drives['sd_fow']:.9g} | {drives['m_fow']:.9g} | "
            f"{item['normalized_interaction']:.9g} |"
        )
    lines.extend([
        "", "## Raffinement", "",
        "Le statut `stable_nonzero` utilise uniquement la variation fine→référence. "
        "Le niveau coarse est un diagnostic affiché, non une troisième transition "
        "requise par la règle fixée.", "",
    ])
    for name, item in classification["refinement"].items():
        lines.append(
            f"- `{name}` : coarse `{item['coarse']:.9g}`, fine `{item['fine']:.9g}`, "
            f"référence `{item['reference']:.9g}`, variation fine→référence "
            f"`{item['fine_to_reference_relative_change']:.6g}`, stable `{item['stable_nonzero']}`."
        )
    controls = reference["controls"]
    lines.extend([
        "", "## Contrôles", "",
        f"- écart matching densité : `{controls['matching_density_max_abs_error']:.3g}` ;",
        f"- écart matching énergie moyenne : `{controls['matching_mean_energy_max_abs_error']:.3g}` ;",
        f"- écart conservation orbitale : `{controls['orbit_conservation_max_abs_error']:.3g}` ;",
        f"- identité exacte : `{controls['identity_exact']}` ;",
        f"- dispersion noyau uniforme : `{controls['uniform_kernel_spread']:.3g}` ;",
        f"- dispersion noyau de moments : `{controls['affine_moment_kernel_spread']:.3g}` ;",
        f"- erreur de linéarité : `{controls['linearity_abs_error']:.3g}` ;",
        f"- échecs : `{classification['control_failures']}`.", "",
        "## Portée et retrait", "",
        "Drive fictif : `model_internal`. Matching, métadonnées et reconstruction : "
        "`pipeline_verified`.", "",
        "Revendications non soutenues : "
        + ", ".join(f"`{claim}`" for claim in result["unsupported_claims"])
        + ".", "",
        f"Effet possible du protocole : {result['protocol_effect']}", "",
        f"Condition de retrait : {result['withdrawal_condition']}",
    ])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=CONFIG_PATH)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    config = load_config(args.config)
    output = args.output or ROOT.parent / "reports" / f"fictive-tae-matrix-v{config['version']}"
    result = execute(config)
    output.mkdir(parents=True, exist_ok=True)
    (output / "result.json").write_text(
        json.dumps(result, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    write_report(result, output / "report.md")
    print(json.dumps(result["classification"], sort_keys=True))


if __name__ == "__main__":
    main()
