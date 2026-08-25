#!/usr/bin/env python3
"""Bounded preparation of the four-background F0 matrix.

The module operates on non-negative *energy-bin masses* indexed by radius,
pitch, and energy.  Raw sampled distribution values must therefore be
converted with their declared quadrature before being supplied here.  The
module verifies the declared moment-matching and orbit-map invariants; it does
not calculate a TAE eigenmode, a growth rate, or reactor performance.
"""

from __future__ import annotations

from copy import deepcopy
from hashlib import sha256
import json
import math
from typing import Mapping, Sequence


Distribution = list[list[list[float]]]
OrbitMap = list[list[list[list[float]]]]  # pitch, energy, destination radius, source radius


def _validate_energy_grid(energies: Sequence[float]) -> None:
    if len(energies) < 3:
        raise ValueError("at least three positive energy nodes are required")
    if any(not math.isfinite(value) or value <= 0 for value in energies):
        raise ValueError("energy nodes must be finite and strictly positive")
    if any(right <= left for left, right in zip(energies, energies[1:])):
        raise ValueError("energy nodes must be strictly increasing")


def _validate_distribution(distribution: Distribution, energies: Sequence[float]) -> tuple[int, int, int]:
    _validate_energy_grid(energies)
    if not distribution or not distribution[0] or not distribution[0][0]:
        raise ValueError("distribution must have radius, pitch, and energy dimensions")
    radius_count = len(distribution)
    pitch_count = len(distribution[0])
    energy_count = len(energies)
    for radial_slice in distribution:
        if len(radial_slice) != pitch_count:
            raise ValueError("pitch count must be constant across radii")
        for energy_slice in radial_slice:
            if len(energy_slice) != energy_count:
                raise ValueError("energy count must match the energy grid")
            if any(not math.isfinite(value) or value < 0 for value in energy_slice):
                raise ValueError("distribution weights must be finite and non-negative")
            if sum(energy_slice) <= 0:
                raise ValueError("each radius/pitch cell must contain positive total density")
    return radius_count, pitch_count, energy_count


def _validate_coordinate_metadata(
    radius_grid: Sequence[float],
    pitch_grid: Sequence[float],
    energies: Sequence[float],
    units: Mapping[str, str],
    quadrature: Mapping[str, object],
    radius_count: int,
    pitch_count: int,
) -> None:
    if len(radius_grid) != radius_count or len(pitch_grid) != pitch_count:
        raise ValueError("radius and pitch grids must match the distribution dimensions")
    for name, values in (("radius", radius_grid), ("pitch", pitch_grid)):
        if any(not math.isfinite(value) for value in values):
            raise ValueError(f"{name} grid values must be finite")
        if any(right <= left for left, right in zip(values, values[1:])):
            raise ValueError(f"{name} grid values must be strictly increasing")
    required_units = {"radius", "pitch", "energy", "cell_mass"}
    if set(units) != required_units or any(not str(value).strip() for value in units.values()):
        raise ValueError("units must declare radius, pitch, energy, and cell_mass")
    if quadrature.get("representation") != "cell_mass":
        raise ValueError("quadrature representation must explicitly be cell_mass")
    if quadrature.get("jacobian_applied") is not True:
        raise ValueError("quadrature must confirm that the declared Jacobian is applied")
    expected = {
        "radial_weights": len(radius_grid),
        "pitch_weights": len(pitch_grid),
        "energy_weights": len(energies),
    }
    for field, length in expected.items():
        weights = quadrature.get(field)
        if not isinstance(weights, list) or len(weights) != length:
            raise ValueError(f"quadrature {field} must match its coordinate grid")
        if any(not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0 for value in weights):
            raise ValueError(f"quadrature {field} must contain positive finite values")


def density(values: Sequence[float]) -> float:
    return sum(values)


def mean_energy(values: Sequence[float], energies: Sequence[float]) -> float:
    total = density(values)
    if total <= 0:
        raise ValueError("mean energy is undefined for zero density")
    return sum(weight * energy for weight, energy in zip(values, energies)) / total


def _canonical_kernel(energies: Sequence[float], temperature: float) -> list[float]:
    """Evaluate a Maxwellian energy kernel with a stable common exponent."""

    log_weights = [0.5 * math.log(energy) - energy / temperature for energy in energies]
    maximum = max(log_weights)
    return [math.exp(value - maximum) for value in log_weights]


def _discrete_maxwellian_mean(energies: Sequence[float], temperature: float) -> float:
    return mean_energy(_canonical_kernel(energies, temperature), energies)


def canonical_maxwellian_cell(values: Sequence[float], energies: Sequence[float]) -> tuple[list[float], float]:
    """Match density and first energy moment with a positive-temperature kernel.

    The energy form is the discrete counterpart of `sqrt(E) exp(-E/T)`.  A
    finite energy grid must extend far enough to represent the source moment;
    otherwise the function refuses the match instead of silently changing the
    target moment or using a negative temperature.
    """

    _validate_energy_grid(energies)
    source_density = density(values)
    if source_density <= 0:
        raise ValueError("source cell must contain positive density")
    target_mean = mean_energy(values, energies)
    scale = max(energies)
    lower_temperature = scale * 1e-10
    upper_temperature = scale * 1e10
    lower_mean = _discrete_maxwellian_mean(energies, lower_temperature)
    upper_mean = _discrete_maxwellian_mean(energies, upper_temperature)
    tolerance = max(1e-10, scale * 1e-10)
    if target_mean < lower_mean - tolerance or target_mean > upper_mean + tolerance:
        raise ValueError(
            "source mean energy cannot be represented by a positive-temperature "
            "canonical Maxwellian on this finite energy grid"
        )

    low, high = lower_temperature, upper_temperature
    for _ in range(160):
        middle = (low + high) / 2
        current_mean = _discrete_maxwellian_mean(energies, middle)
        if current_mean < target_mean:
            low = middle
        else:
            high = middle
    temperature = (low + high) / 2
    kernel = _canonical_kernel(energies, temperature)
    normalizer = density(kernel)
    matched = [source_density * value / normalizer for value in kernel]
    if not math.isclose(density(matched), source_density, rel_tol=0, abs_tol=tolerance):
        raise AssertionError("density matching failed")
    if not math.isclose(mean_energy(matched, energies), target_mean, rel_tol=0, abs_tol=tolerance):
        raise AssertionError("energy-moment matching failed")
    return matched, temperature


def match_canonical_maxwellian(source: Distribution, energies: Sequence[float]) -> tuple[Distribution, list[list[float]]]:
    """Match at every source-coordinate `(radius, pitch)` cell before FOW."""

    _validate_distribution(source, energies)
    matched: Distribution = []
    temperatures: list[list[float]] = []
    for radial_slice in source:
        matched_radius: list[list[float]] = []
        temperatures_radius: list[float] = []
        for cell in radial_slice:
            result, temperature = canonical_maxwellian_cell(cell, energies)
            matched_radius.append(result)
            temperatures_radius.append(temperature)
        matched.append(matched_radius)
        temperatures.append(temperatures_radius)
    return matched, temperatures


def _validate_orbit_map(orbit_map: OrbitMap, radius_count: int, pitch_count: int, energy_count: int) -> None:
    if len(orbit_map) != pitch_count:
        raise ValueError("orbit map pitch dimension must match the source")
    for pitch_slice in orbit_map:
        if len(pitch_slice) != energy_count:
            raise ValueError("orbit map energy dimension must match the source")
        for matrix in pitch_slice:
            if len(matrix) != radius_count or any(len(row) != radius_count for row in matrix):
                raise ValueError("each orbit map must be square in radius")
            for source_radius in range(radius_count):
                column = [matrix[destination_radius][source_radius] for destination_radius in range(radius_count)]
                if any(not math.isfinite(value) or value < 0 for value in column):
                    raise ValueError("orbit map entries must be finite and non-negative")
                if not math.isclose(sum(column), 1.0, rel_tol=0, abs_tol=1e-12):
                    raise ValueError("each orbit-map source column must conserve density")


def apply_orbit_map(source: Distribution, energies: Sequence[float], orbit_map: OrbitMap) -> Distribution:
    """Apply the same declared conservative FOW operator to a background."""

    radius_count, pitch_count, energy_count = _validate_distribution(source, energies)
    _validate_orbit_map(orbit_map, radius_count, pitch_count, energy_count)
    result: Distribution = [
        [[0.0 for _ in range(energy_count)] for _ in range(pitch_count)]
        for _ in range(radius_count)
    ]
    for pitch in range(pitch_count):
        for energy in range(energy_count):
            matrix = orbit_map[pitch][energy]
            for destination in range(radius_count):
                result[destination][pitch][energy] = sum(
                    matrix[destination][source_radius] * source[source_radius][pitch][energy]
                    for source_radius in range(radius_count)
                )
    return result


def total_density(distribution: Distribution) -> float:
    return sum(sum(sum(cell) for cell in radial_slice) for radial_slice in distribution)


def _content_hash(value: object) -> str:
    serialized = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return f"sha256:{sha256(serialized.encode('utf-8')).hexdigest()}"


def build_four_backgrounds(
    source_sd: Distribution,
    energies: Sequence[float],
    orbit_map: OrbitMap,
    *,
    source_id: str,
    orbit_operator_id: str,
    radius_grid: Sequence[float],
    pitch_grid: Sequence[float],
    units: Mapping[str, str],
    quadrature: Mapping[str, object],
) -> dict[str, object]:
    """Build the frozen `{SD, M} × {ZOW, FOW}` matrix.

    The canonical Maxwellian is fitted in source coordinates separately for
    every `(radius, pitch)` cell.  The *same* supplied orbit operator is then
    applied to SD and M.  This avoids silently re-matching after orbit motion,
    which would erase a possible shape-by-orbit interaction in a future solver.
    """

    if not source_id.strip() or not orbit_operator_id.strip():
        raise ValueError("source and orbit operator identifiers must be non-empty")
    radius_count, pitch_count, energy_count = _validate_distribution(source_sd, energies)
    _validate_coordinate_metadata(
        radius_grid,
        pitch_grid,
        energies,
        units,
        quadrature,
        radius_count,
        pitch_count,
    )
    _validate_orbit_map(orbit_map, radius_count, pitch_count, energy_count)
    maxwellian, temperatures = match_canonical_maxwellian(source_sd, energies)
    sd_zow = deepcopy(source_sd)
    m_zow = maxwellian
    sd_fow = apply_orbit_map(sd_zow, energies, orbit_map)
    m_fow = apply_orbit_map(m_zow, energies, orbit_map)
    before_sd, before_m = total_density(sd_zow), total_density(m_zow)
    after_sd, after_m = total_density(sd_fow), total_density(m_fow)
    for before, after in ((before_sd, after_sd), (before_m, after_m)):
        if not math.isclose(before, after, rel_tol=0, abs_tol=1e-10):
            raise AssertionError("the declared orbit map did not conserve total density")
    return {
        "metadata": {
            "scope": "pipeline_verified",
            "scope_limitations": ["synthetic_or_supplied_input_only"],
            "input_semantics": "nonnegative energy-bin masses with any quadrature already applied",
            "input_schema": "f0-cell-mass-grid/v1",
            "provenance_contract_complete": True,
            "source_id": source_id,
            "source_content_hash": _content_hash(source_sd),
            "radius_grid_hash": _content_hash(list(radius_grid)),
            "pitch_grid_hash": _content_hash(list(pitch_grid)),
            "energy_grid_hash": _content_hash(list(energies)),
            "units": dict(units),
            "units_hash": _content_hash(dict(units)),
            "quadrature": deepcopy(dict(quadrature)),
            "quadrature_hash": _content_hash(dict(quadrature)),
            "orbit_operator_id": orbit_operator_id,
            "orbit_operator_hash": _content_hash(orbit_map),
            "matching_convention": "match_density_and_mean_energy_per_source_radius_pitch_before_common_fow_operator",
            "not_established": [
                "Falpha realism",
                "equilibrium realism",
                "TAE eigenmode",
                "resonant drive",
                "stability",
                "reactor relevance",
            ],
        },
        "temperatures": temperatures,
        "backgrounds": {
            "sd_zow": sd_zow,
            "m_zow": m_zow,
            "sd_fow": sd_fow,
            "m_fow": m_fow,
        },
    }
