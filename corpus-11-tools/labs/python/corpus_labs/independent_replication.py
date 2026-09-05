"""A bounded local harness for comparing independently submitted implementations.

The harness is deliberately agnostic about a research model.  A research owns
its frozen files, command, declared dependencies, output paths and scientific
interpretation.  This module verifies only the execution contract around
those objects.

It can demonstrate that a separate submission was run from a staged local
projection which omitted the reference source.  It cannot demonstrate that
the authors, ideas, toolchains, or environments were externally independent;
``independence_verdict`` consequently remains ``"independence_unknown"``.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tempfile
from typing import Any, Mapping, Sequence


FROZEN_PACKAGE_SCHEMA = "corpus-independent-replication-package/v1"
ATTESTATION_SCHEMA = "corpus-independent-replication-attestation/v1"
OUTPUT_CONTRACT_SCHEMA = "corpus-independent-replication-output-contract/v1"
ISOLATION_BACKEND_BUBBLEWRAP = "bubblewrap"

_SANDBOX_PATHS = {"/inputs", "/implementation", "/outputs", "/work"}
_BWRAP_UNAVAILABLE_HINTS = (
    "operation not permitted",
    "creating new namespace",
    "create new namespace",
    "user namespace",
    "user namespaces",
    "unshare",
)


class ReplicationError(ValueError):
    """A frozen package, declaration, or staged submission is invalid."""


@dataclass(frozen=True)
class RuntimeMount:
    """A validated runtime projection with distinct host and guest paths.

    ``host_path`` is resolved solely for host-side validation and as the
    Bubblewrap source. ``guest_path`` is the original absolute lexical path
    and remains untouched: a resolved ``/lib`` source still has to be visible
    to the guest as ``/lib``.
    """

    host_path: Path
    guest_path: Path


def canonical_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_bytes(value: bytes) -> str:
    return f"sha256:{hashlib.sha256(value).hexdigest()}"


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def sha256_value(value: object) -> str:
    return sha256_bytes(canonical_json(value).encode("utf-8"))


def _relative_path(value: object, label: str) -> Path:
    if not isinstance(value, str) or not value:
        raise ReplicationError(f"{label} must be a non-empty relative path")
    path = PurePosixPath(value)
    if path.is_absolute() or ".." in path.parts or str(path) in {".", ""}:
        raise ReplicationError(f"{label} escapes its declared root: {value!r}")
    return Path(*path.parts)


def _unique_strings(value: object, label: str, *, nonempty: bool = False) -> list[str]:
    if not isinstance(value, list) or (nonempty and not value):
        raise ReplicationError(f"{label} must be {'a non-empty ' if nonempty else 'an '}list")
    if any(not isinstance(item, str) or not item for item in value):
        raise ReplicationError(f"{label} must contain non-empty strings")
    if len(set(value)) != len(value):
        raise ReplicationError(f"{label} must not contain duplicates")
    return list(value)


def _dependency_map(value: object, label: str) -> dict[str, str]:
    if not isinstance(value, list):
        raise ReplicationError(f"{label} must be a list")
    result: dict[str, str] = {}
    for index, dependency in enumerate(value):
        if not isinstance(dependency, Mapping):
            raise ReplicationError(f"{label}[{index}] must be an object")
        identifier, fingerprint = dependency.get("id"), dependency.get("fingerprint")
        if not isinstance(identifier, str) or not identifier:
            raise ReplicationError(f"{label}[{index}].id must be a non-empty string")
        if not isinstance(fingerprint, str) or not re.fullmatch(r"sha256:[0-9a-f]{64}", fingerprint):
            raise ReplicationError(f"{label}[{index}].fingerprint must be a SHA-256 fingerprint")
        if identifier in result:
            raise ReplicationError(f"{label} repeats dependency {identifier!r}")
        result[identifier] = fingerprint
    return result


def validate_frozen_package(package: Mapping[str, Any], root: Path) -> dict[str, dict[str, str]]:
    """Verify each permitted input exists under *root* with its frozen hash."""
    if package.get("schema") != FROZEN_PACKAGE_SCHEMA:
        raise ReplicationError(f"package.schema must equal {FROZEN_PACKAGE_SCHEMA}")
    if not isinstance(package.get("package_id"), str) or not package["package_id"]:
        raise ReplicationError("package_id must be a non-empty string")
    inputs = package.get("inputs")
    if not isinstance(inputs, list) or not inputs:
        raise ReplicationError("package.inputs must be a non-empty list")
    allowed = set(_unique_strings(package.get("allowed_input_ids"), "allowed_input_ids", nonempty=True))
    resolved_root = root.resolve()
    resolved: dict[str, dict[str, str]] = {}
    for index, item in enumerate(inputs):
        if not isinstance(item, Mapping):
            raise ReplicationError(f"inputs[{index}] must be an object")
        identifier = item.get("id")
        if not isinstance(identifier, str) or not identifier:
            raise ReplicationError(f"inputs[{index}].id must be a non-empty string")
        if identifier in resolved:
            raise ReplicationError(f"inputs repeats id {identifier!r}")
        relative = _relative_path(item.get("path"), f"inputs[{index}].path")
        expected_hash = item.get("sha256")
        if not isinstance(expected_hash, str) or not re.fullmatch(r"sha256:[0-9a-f]{64}", expected_hash):
            raise ReplicationError(f"inputs[{index}].sha256 must be a SHA-256 fingerprint")
        path = (resolved_root / relative).resolve()
        if resolved_root not in path.parents or not path.is_file():
            raise ReplicationError(f"input {identifier!r} is not a regular file below the package root")
        observed_hash = sha256_file(path)
        if observed_hash != expected_hash:
            raise ReplicationError(
                f"frozen input fingerprint differs for {identifier!r}: expected {expected_hash}, got {observed_hash}"
            )
        resolved[identifier] = {"path": str(relative), "sha256": observed_hash}
    if allowed != set(resolved):
        raise ReplicationError("allowed_input_ids must name exactly the frozen package inputs")
    return resolved


def validate_attestation(
    attestation: Mapping[str, Any], package: Mapping[str, Any], *, role: str
) -> dict[str, Any]:
    """Reject unlisted inputs/dependencies and a tampered output declaration."""
    if attestation.get("schema") != ATTESTATION_SCHEMA:
        raise ReplicationError(f"attestation.schema must equal {ATTESTATION_SCHEMA}")
    if attestation.get("role") != role:
        raise ReplicationError(f"attestation role must be {role!r}")
    if not isinstance(attestation.get("implementation_id"), str) or not attestation["implementation_id"]:
        raise ReplicationError("implementation_id must be a non-empty string")
    environment = attestation.get("environment")
    if not isinstance(environment, Mapping) or not environment.get("runtime"):
        raise ReplicationError("environment must declare a runtime")
    allowed_inputs = set(_unique_strings(package.get("allowed_input_ids"), "allowed_input_ids", nonempty=True))
    declared_inputs = set(_unique_strings(attestation.get("declared_input_ids"), "declared_input_ids"))
    observed_inputs = set(_unique_strings(attestation.get("observed_input_ids"), "observed_input_ids"))
    if not declared_inputs.issubset(allowed_inputs):
        raise ReplicationError("declared input is not on the frozen package allowlist")
    if not observed_inputs.issubset(declared_inputs):
        raise ReplicationError("observed input was not declared")
    declared_dependencies = _dependency_map(attestation.get("declared_dependencies"), "declared_dependencies")
    observed_dependencies = _dependency_map(attestation.get("observed_dependencies"), "observed_dependencies")
    for identifier, fingerprint in observed_dependencies.items():
        if declared_dependencies.get(identifier) != fingerprint:
            raise ReplicationError(f"observed dependency {identifier!r} was absent or differs from its declaration")
    output = attestation.get("output")
    if not isinstance(output, Mapping):
        raise ReplicationError("output must be an object")
    if attestation.get("output_sha256") != sha256_value(output):
        raise ReplicationError("output_sha256 does not match the declared output")
    return {
        "declared_dependencies": declared_dependencies,
        "observed_dependencies": observed_dependencies,
        "output": deepcopy(dict(output)),
    }


def _pointer_value(value: object, pointer: str) -> object:
    if not isinstance(pointer, str) or not pointer.startswith("/"):
        raise ReplicationError("output paths must be JSON pointers beginning with '/'")
    current = value
    for raw_part in pointer[1:].split("/"):
        part = raw_part.replace("~1", "/").replace("~0", "~")
        if isinstance(current, Mapping) and part in current:
            current = current[part]
        elif isinstance(current, list) and part.isdigit() and int(part) < len(current):
            current = current[int(part)]
        else:
            raise KeyError(pointer)
    return current


def validate_output_contract(contract: Mapping[str, Any]) -> list[str]:
    if contract.get("schema") != OUTPUT_CONTRACT_SCHEMA:
        raise ReplicationError(f"output contract schema must equal {OUTPUT_CONTRACT_SCHEMA}")
    return _unique_strings(contract.get("comparable_paths"), "comparable_paths", nonempty=True)


def compare_outputs(
    reference: Mapping[str, Any], separate: Mapping[str, Any], comparable_paths: Sequence[str]
) -> dict[str, Any]:
    """Compare only research-declared JSON paths, preserving visible differences."""
    differences: list[dict[str, Any]] = []
    missing: list[dict[str, str]] = []
    for pointer in comparable_paths:
        try:
            reference_value = _pointer_value(reference, pointer)
        except KeyError:
            missing.append({"implementation": "reference", "path": pointer})
            continue
        try:
            separate_value = _pointer_value(separate, pointer)
        except KeyError:
            missing.append({"implementation": "separate", "path": pointer})
            continue
        if canonical_json(reference_value) != canonical_json(separate_value):
            differences.append({"path": pointer, "reference": reference_value, "separate": separate_value})
    if missing:
        verdict = "incomplete_output"
    elif differences:
        verdict = "divergent_output"
    else:
        verdict = "matching_output"
    return {"comparison_verdict": verdict, "differences": differences, "missing_output_paths": missing}


def _local_separation(attestation: Mapping[str, Any]) -> tuple[str, list[str]]:
    separation = attestation.get("local_separation")
    if not isinstance(separation, Mapping):
        return "not_demonstrated", ["separate implementation supplied no local separation record"]
    if separation.get("reference_code_accessible") is True:
        return "reference_code_accessible", ["reference code was accessible to the separate implementation"]
    if separation.get("mode") == "staged_local_projection" and separation.get("reference_code_present") is False:
        return "local_projection_tested", [
            "the staged working directory omitted the listed reference source files",
            "the harness did not prove process, author, environment, or external independence",
        ]
    return "not_demonstrated", ["the staged projection did not establish reference-code exclusion"]


def _execution_context(attestation: Mapping[str, Any]) -> dict[str, str]:
    """Describe the exercised execution boundary without inferring independence."""
    separation = attestation.get("local_separation")
    if not isinstance(separation, Mapping):
        return {
            "projection": "not_demonstrated",
            "process_isolation": "not_exercised",
            "backend": "none",
        }
    if separation.get("mode") == "bubblewrap_process_isolation":
        return {
            "projection": "staged_local_projection",
            "process_isolation": (
                "exercised" if separation.get("process_isolation_exercised") is True else "not_exercised"
            ),
            "backend": str(separation.get("backend", ISOLATION_BACKEND_BUBBLEWRAP)),
        }
    if separation.get("mode") == "staged_local_projection":
        return {
            "projection": "staged_local_projection",
            "process_isolation": "not_exercised",
            "backend": "none",
        }
    return {
        "projection": "not_demonstrated",
        "process_isolation": "not_exercised",
        "backend": "none",
    }


def _isolated_separation(attestation: Mapping[str, Any]) -> tuple[str, list[str]] | None:
    separation = attestation.get("local_separation")
    if not isinstance(separation, Mapping) or separation.get("mode") != "bubblewrap_process_isolation":
        return None
    if separation.get("reference_code_accessible") is True or separation.get("reference_code_present") is not False:
        return "reference_code_accessible", ["reference code was accessible to the separate implementation"]
    if separation.get("process_isolation_exercised") is not True:
        return "not_demonstrated", ["the Bubblewrap process-isolation record was incomplete"]
    if separation.get("network") != "disabled":
        return "not_demonstrated", ["the Bubblewrap record did not establish network disablement"]
    return "process_isolation_exercised", [
        "Bubblewrap process isolation was exercised with the declared projected mounts",
        "this local process boundary does not prove author, environment, dependency, or external independence",
    ]


def evaluate_replication(
    package: Mapping[str, Any],
    package_root: Path,
    output_contract: Mapping[str, Any],
    reference_attestation: Mapping[str, Any],
    separate_attestation: Mapping[str, Any],
) -> dict[str, Any]:
    """Return an explicit local comparison; never certify external independence."""
    frozen_inputs = validate_frozen_package(package, package_root)
    reference = validate_attestation(reference_attestation, package, role="reference")
    separate = validate_attestation(separate_attestation, package, role="separate")
    comparable_paths = validate_output_contract(output_contract)
    comparison = compare_outputs(reference["output"], separate["output"], comparable_paths)

    reference_dependencies = reference["observed_dependencies"]
    separate_dependencies = separate["observed_dependencies"]
    common = [
        {"id": identifier, "fingerprint": reference_dependencies[identifier]}
        for identifier in sorted(set(reference_dependencies) & set(separate_dependencies))
        if reference_dependencies[identifier] == separate_dependencies[identifier]
    ]
    mismatched = [
        {
            "id": identifier,
            "reference": reference_dependencies[identifier],
            "separate": separate_dependencies[identifier],
        }
        for identifier in sorted(set(reference_dependencies) & set(separate_dependencies))
        if reference_dependencies[identifier] != separate_dependencies[identifier]
    ]
    isolated = _isolated_separation(separate_attestation)
    separation_verdict, limitations = isolated or _local_separation(separate_attestation)
    execution_context = _execution_context(separate_attestation)
    return {
        "schema": "corpus-independent-replication-report/v1",
        "package_id": package["package_id"],
        "frozen_inputs": frozen_inputs,
        "comparison": comparison,
        "shared_declared_dependencies": common,
        "dependency_id_fingerprint_differences": mismatched,
        "local_separation_verdict": separation_verdict,
        "execution_context": execution_context,
        "independence_verdict": "independence_unknown",
        "limitations": limitations,
        "overall_verdict": (
            "local_replication_agrees"
            if comparison["comparison_verdict"] == "matching_output"
            and separation_verdict == "local_projection_tested"
            else "isolated_local_replication_agrees"
            if comparison["comparison_verdict"] == "matching_output"
            and separation_verdict == "process_isolation_exercised"
            else "local_replication_not_established"
        ),
    }


def run_projected_submission(
    package: Mapping[str, Any],
    package_root: Path,
    *,
    source_root: Path,
    source_files: Sequence[str],
    command: Sequence[str],
    output_path: str,
    reference_source_files: Sequence[Path] = (),
) -> dict[str, Any]:
    """Run a submission from a temporary local projection of the allowed inputs.

    ``{input:ID}`` and ``{output}`` command tokens are expanded only to files
    inside that projection.  This is a reproducible local staging check, not a
    security sandbox: code running as the same user may still reach files
    outside the temporary directory.
    """
    frozen_inputs = validate_frozen_package(package, package_root)
    if not isinstance(command, Sequence) or isinstance(command, (str, bytes)) or not command:
        raise ReplicationError("command must be a non-empty sequence of tokens")
    staged_sources = [_relative_path(item, "source_files entry") for item in source_files]
    if not staged_sources:
        raise ReplicationError("source_files must name at least one implementation file")
    output_relative = _relative_path(output_path, "output_path")
    source_root = source_root.resolve()
    source_paths = [(source_root / item).resolve() for item in staged_sources]
    if any(source_root not in item.parents or not item.is_file() for item in source_paths):
        raise ReplicationError("a source_files entry is not a regular file below source_root")
    reference_paths = {item.resolve() for item in reference_source_files}
    reference_code_present = any(item in reference_paths for item in source_paths)

    with tempfile.TemporaryDirectory(prefix="corpus-independent-replication-") as temporary:
        stage = Path(temporary)
        input_paths: dict[str, Path] = {}
        for identifier, item in frozen_inputs.items():
            destination = stage / "inputs" / identifier
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(package_root / item["path"], destination)
            input_paths[identifier] = destination
        for relative, source in zip(staged_sources, source_paths):
            destination = stage / "implementation" / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, destination)
        staged_output = stage / "outputs" / output_relative
        staged_output.parent.mkdir(parents=True, exist_ok=True)
        substitutions = {f"{{input:{identifier}}}": str(path) for identifier, path in input_paths.items()}
        substitutions["{output}"] = str(staged_output)
        expanded = [substitutions.get(token, token) for token in command]
        completed = subprocess.run(expanded, cwd=stage, capture_output=True, text=True, check=False)
        if completed.returncode != 0:
            raise ReplicationError(
                f"separate submission failed with exit code {completed.returncode}: {completed.stderr.strip()}"
            )
        if not staged_output.is_file():
            raise ReplicationError("separate submission did not create its declared output")
        try:
            output = json.loads(staged_output.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise ReplicationError("separate submission output is not JSON") from error
        if not isinstance(output, Mapping):
            raise ReplicationError("separate submission output must be a JSON object")
        return {
            "output": dict(output),
            "output_sha256": sha256_value(output),
            "stdout": completed.stdout,
            "local_separation": {
                "mode": "staged_local_projection",
                "reference_code_present": reference_code_present,
                "reference_code_accessible": reference_code_present,
                "projected_input_ids": sorted(input_paths),
                "projected_source_files": [str(path) for path in staged_sources],
            },
        }


def _validate_runtime_mounts(
    runtime_mounts: Sequence[str | Path],
    *,
    package_root: Path,
    source_root: Path,
    reference_source_files: Sequence[Path],
) -> list[RuntimeMount]:
    if not isinstance(runtime_mounts, Sequence) or isinstance(runtime_mounts, (str, bytes)) or not runtime_mounts:
        raise ReplicationError("runtime_mounts must be a non-empty sequence of explicit host paths")
    def git_root(path: Path) -> Path | None:
        for candidate in (path.resolve(), *path.resolve().parents):
            if (candidate / ".git").exists():
                return candidate
        return None

    protected = [package_root.resolve(), source_root.resolve(), *(path.resolve() for path in reference_source_files)]
    protected.extend(root for root in (git_root(package_root), git_root(source_root)) if root is not None)
    home = Path.home().resolve()
    resolved: list[Path] = []
    mounts: list[RuntimeMount] = []
    for index, raw_path in enumerate(runtime_mounts):
        guest_path = Path(raw_path)
        if not guest_path.is_absolute():
            raise ReplicationError(f"runtime_mounts[{index}] must be an absolute host path")
        host_path = guest_path.resolve()
        if not host_path.exists():
            raise ReplicationError(f"runtime_mounts[{index}] does not exist: {host_path}")
        if str(host_path) == "/" or str(host_path) in _SANDBOX_PATHS:
            raise ReplicationError("runtime mounts may not expose the host root or a reserved sandbox path")
        if host_path == home or home in host_path.parents or host_path in home.parents:
            raise ReplicationError("runtime mounts may not expose the user home directory")
        if any(
            host_path == item or item in host_path.parents or host_path in item.parents
            for item in protected
        ):
            raise ReplicationError("runtime mount would expose a package, source, or reference path")
        if host_path in resolved:
            raise ReplicationError("runtime_mounts must not contain duplicates")
        resolved.append(host_path)
        mounts.append(RuntimeMount(host_path=host_path, guest_path=guest_path))
    return mounts


def _build_bubblewrap_command(
    *,
    bwrap_executable: str,
    runtime_mounts: Sequence[RuntimeMount],
    input_directory: Path,
    implementation_directory: Path,
    output_directory: Path,
    command: Sequence[str],
) -> list[str]:
    """Build the closed Bubblewrap command used by :func:`run_isolated_submission`.

    The only project material mounted in the guest is the staged input and
    implementation trees. Runtime sources are resolved and validated on the
    host, while their declared absolute guest destinations remain lexical.
    """
    if not bwrap_executable:
        raise ReplicationError("bwrap_executable must be a non-empty command path")
    if not isinstance(command, Sequence) or isinstance(command, (str, bytes)) or not command:
        raise ReplicationError("command must be a non-empty sequence of tokens")
    command_tokens = [str(token) for token in command]
    if any(not token for token in command_tokens):
        raise ReplicationError("command must not contain empty tokens")
    result = [
        bwrap_executable,
        "--die-with-parent",
        "--new-session",
        "--unshare-all",
        "--unshare-net",
        "--clearenv",
    ]
    for mount in runtime_mounts:
        if not isinstance(mount, RuntimeMount):
            raise ReplicationError("runtime_mounts must contain validated RuntimeMount values")
        if not mount.host_path.is_absolute() or not mount.guest_path.is_absolute():
            raise ReplicationError("runtime mount paths must be absolute")
        result.extend(["--ro-bind", str(mount.host_path), str(mount.guest_path)])
    result.extend(
        [
            "--ro-bind",
            str(input_directory),
            "/inputs",
            "--ro-bind",
            str(implementation_directory),
            "/implementation",
            "--bind",
            str(output_directory),
            "/outputs",
            "--proc",
            "/proc",
            "--dev",
            "/dev",
            "--dir",
            "/work",
            "--chdir",
            "/work",
            "--",
            *command_tokens,
        ]
    )
    return result


def _is_bwrap_unavailable(stderr: str) -> bool:
    normalized = stderr.lower()
    return any(hint in normalized for hint in _BWRAP_UNAVAILABLE_HINTS)


def _resolve_bubblewrap() -> str | None:
    """Resolve the production Bubblewrap executable without caller injection."""
    executable = shutil.which("bwrap")
    if not executable:
        return None
    executable_path = Path(executable)
    if not executable_path.is_file():
        return None
    return str(executable_path.resolve())


def _isolation_unavailable(reason: str, *, backend: str = ISOLATION_BACKEND_BUBBLEWRAP) -> dict[str, Any]:
    """Return an explicit non-execution result; never fall back to projection."""
    return {
        "execution_verdict": "isolation_unavailable",
        "isolation_backend": backend,
        "reason": reason,
        "independence_verdict": "independence_unknown",
        "output": None,
    }


def run_isolated_submission(
    package: Mapping[str, Any],
    package_root: Path,
    *,
    source_root: Path,
    source_files: Sequence[str],
    command: Sequence[str],
    output_path: str,
    runtime_mounts: Sequence[str | Path],
    reference_source_files: Sequence[Path] = (),
) -> dict[str, Any]:
    """Run a separate submission behind Bubblewrap when the host permits it.

    There is intentionally no fallback to :func:`run_projected_submission`.
    A missing Bubblewrap executable or a host refusal to create namespaces
    returns ``execution_verdict == 'isolation_unavailable'``.  Invalid package
    or mount declarations remain contract errors and raise :class:`ReplicationError`.
    """
    frozen_inputs = validate_frozen_package(package, package_root)
    if not isinstance(command, Sequence) or isinstance(command, (str, bytes)) or not command:
        raise ReplicationError("command must be a non-empty sequence of tokens")
    staged_sources = [_relative_path(item, "source_files entry") for item in source_files]
    if not staged_sources:
        raise ReplicationError("source_files must name at least one implementation file")
    output_relative = _relative_path(output_path, "output_path")
    source_root = source_root.resolve()
    source_paths = [(source_root / item).resolve() for item in staged_sources]
    if any(source_root not in item.parents or not item.is_file() for item in source_paths):
        raise ReplicationError("a source_files entry is not a regular file below source_root")
    reference_paths = {item.resolve() for item in reference_source_files}
    if any(item in reference_paths for item in source_paths):
        raise ReplicationError("isolated submissions may not stage a listed reference source file")
    mounts = _validate_runtime_mounts(
        runtime_mounts,
        package_root=package_root,
        source_root=source_root,
        reference_source_files=reference_source_files,
    )
    executable = _resolve_bubblewrap()
    if not executable:
        return _isolation_unavailable("Bubblewrap executable was not found on the host PATH")

    with tempfile.TemporaryDirectory(prefix="corpus-independent-replication-isolated-") as temporary:
        stage = Path(temporary)
        input_directory = stage / "inputs"
        implementation_directory = stage / "implementation"
        output_directory = stage / "outputs"
        input_paths: dict[str, str] = {}
        for identifier, item in frozen_inputs.items():
            destination = input_directory / identifier
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(package_root / item["path"], destination)
            input_paths[identifier] = f"/inputs/{identifier}"
        for relative, source in zip(staged_sources, source_paths):
            destination = implementation_directory / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, destination)
        staged_output = output_directory / output_relative
        staged_output.parent.mkdir(parents=True, exist_ok=True)
        substitutions = {f"{{input:{identifier}}}": path for identifier, path in input_paths.items()}
        substitutions["{output}"] = f"/outputs/{output_relative.as_posix()}"
        expanded = [substitutions.get(token, token) for token in command]
        bwrap_command = _build_bubblewrap_command(
            bwrap_executable=executable,
            runtime_mounts=mounts,
            input_directory=input_directory,
            implementation_directory=implementation_directory,
            output_directory=output_directory,
            command=expanded,
        )
        completed = subprocess.run(bwrap_command, capture_output=True, text=True, check=False)
        if completed.returncode != 0:
            if _is_bwrap_unavailable(completed.stderr):
                return _isolation_unavailable(
                    f"Bubblewrap could not create the requested namespace boundary: {completed.stderr.strip()}"
                )
            raise ReplicationError(
                f"isolated separate submission failed with exit code {completed.returncode}: {completed.stderr.strip()}"
            )
        if not staged_output.is_file():
            raise ReplicationError("isolated separate submission did not create its declared output")
        try:
            output = json.loads(staged_output.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise ReplicationError("isolated separate submission output is not JSON") from error
        if not isinstance(output, Mapping):
            raise ReplicationError("isolated separate submission output must be a JSON object")
        return {
            "execution_verdict": "process_isolation_exercised",
            "isolation_backend": ISOLATION_BACKEND_BUBBLEWRAP,
            "output": dict(output),
            "output_sha256": sha256_value(output),
            "stdout": completed.stdout,
            "local_separation": {
                "mode": "bubblewrap_process_isolation",
                "backend": ISOLATION_BACKEND_BUBBLEWRAP,
                "process_isolation_exercised": True,
                "network": "disabled",
                "reference_code_present": False,
                "reference_code_accessible": False,
                "projected_input_ids": sorted(input_paths),
                "projected_source_files": [str(path) for path in staged_sources],
                "runtime_mounts": [
                    {"host_path": str(mount.host_path), "guest_path": str(mount.guest_path)}
                    for mount in mounts
                ],
            },
        }
