from __future__ import annotations

import json
import inspect
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from corpus_labs.independent_replication import (
    ATTESTATION_SCHEMA,
    FROZEN_PACKAGE_SCHEMA,
    OUTPUT_CONTRACT_SCHEMA,
    ReplicationError,
    RuntimeMount,
    _validate_runtime_mounts,
    _build_bubblewrap_command,
    evaluate_replication,
    run_isolated_submission,
    run_projected_submission,
    sha256_file,
    sha256_value,
    validate_attestation,
    validate_frozen_package,
)


class IndependentReplicationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        (self.root / "input.json").write_text('{"case":"generic"}\n', encoding="utf-8")
        self.package = {
            "schema": FROZEN_PACKAGE_SCHEMA,
            "package_id": "generic-replication-fixture",
            "inputs": [{"id": "case", "path": "input.json", "sha256": sha256_file(self.root / "input.json")}],
            "allowed_input_ids": ["case"],
        }
        self.contract = {"schema": OUTPUT_CONTRACT_SCHEMA, "comparable_paths": ["/result", "/details"]}
        self.source_root = self.root / "submission"
        self.source_root.mkdir()
        (self.source_root / "submission.py").write_text(
            "import json, sys\n"
            "with open(sys.argv[1], encoding='utf-8') as source:\n"
            "    payload = json.load(source)\n"
            "with open(sys.argv[2], 'w', encoding='utf-8') as target:\n"
            "    json.dump({'result': payload['case'], 'details': {'domain': 'isolated'}}, target)\n",
            encoding="utf-8",
        )

    def tearDown(self):
        self.temporary.cleanup()

    def attestation(self, role: str, output: dict, *, separation: dict | None = None) -> dict:
        dependencies = [{"id": "runtime", "fingerprint": "sha256:" + "1" * 64}]
        record = {
            "schema": ATTESTATION_SCHEMA,
            "implementation_id": f"{role}-implementation",
            "role": role,
            "environment": {"runtime": "Python test runtime"},
            "declared_input_ids": ["case"],
            "observed_input_ids": ["case"],
            "declared_dependencies": dependencies,
            "observed_dependencies": dependencies,
            "output": output,
            "output_sha256": sha256_value(output),
        }
        if separation is not None:
            record["local_separation"] = separation
        return record

    def evaluate(self, separate_output: dict = {"result": "same", "details": {"domain": "unrelated"}}, *, separation=None):
        reference = self.attestation("reference", {"result": "same", "details": {"domain": "unrelated"}})
        separate = self.attestation(
            "separate",
            separate_output,
            separation=separation
            or {"mode": "staged_local_projection", "reference_code_present": False, "reference_code_accessible": False},
        )
        return evaluate_replication(self.package, self.root, self.contract, reference, separate)

    def test_generic_matching_outputs_are_not_external_independence(self):
        report = self.evaluate()
        self.assertEqual(report["overall_verdict"], "local_replication_agrees")
        self.assertEqual(report["independence_verdict"], "independence_unknown")
        self.assertEqual(report["shared_declared_dependencies"][0]["id"], "runtime")

    def test_modified_fingerprint_is_rejected(self):
        self.package["inputs"][0]["sha256"] = "sha256:" + "0" * 64
        with self.assertRaisesRegex(ReplicationError, "fingerprint differs"):
            validate_frozen_package(self.package, self.root)

    def test_unallowed_input_is_rejected(self):
        attestation = self.attestation("reference", {"result": "same", "details": {}})
        attestation["declared_input_ids"] = ["case", "secret"]
        attestation["observed_input_ids"] = ["case", "secret"]
        with self.assertRaisesRegex(ReplicationError, "allowlist"):
            validate_attestation(attestation, self.package, role="reference")

    def test_undeclared_dependency_is_rejected(self):
        attestation = self.attestation("reference", {"result": "same", "details": {}})
        attestation["observed_dependencies"] = [
            *attestation["observed_dependencies"],
            {"id": "hidden-oracle", "fingerprint": "sha256:" + "2" * 64},
        ]
        with self.assertRaisesRegex(ReplicationError, "absent or differs"):
            validate_attestation(attestation, self.package, role="reference")

    def test_divergent_output_is_visible(self):
        report = self.evaluate({"result": "different", "details": {"domain": "unrelated"}})
        self.assertEqual(report["comparison"]["comparison_verdict"], "divergent_output")
        self.assertEqual(report["comparison"]["differences"][0]["path"], "/result")

    def test_reference_code_accessible_fails_local_separation(self):
        reference_source = self.root / "reference.py"
        reference_source.write_text(
            "import json, sys\n"
            "with open(sys.argv[1], 'w', encoding='utf-8') as target:\n"
            "    json.dump({'result': 'same', 'details': {'domain': 'unrelated'}}, target)\n",
            encoding="utf-8",
        )
        projected = run_projected_submission(
            self.package,
            self.root,
            source_root=self.root,
            source_files=["reference.py"],
            command=[sys.executable, "implementation/reference.py", "{output}"],
            output_path="report.json",
            reference_source_files=[reference_source],
        )
        report = self.evaluate(projected["output"], separation=projected["local_separation"])
        self.assertEqual(report["local_separation_verdict"], "reference_code_accessible")
        self.assertEqual(report["overall_verdict"], "local_replication_not_established")

    def test_incomplete_output_is_visible(self):
        report = self.evaluate({"result": "same"})
        self.assertEqual(report["comparison"]["comparison_verdict"], "incomplete_output")
        self.assertEqual(report["comparison"]["missing_output_paths"], [{"implementation": "separate", "path": "/details"}])

    def test_bubblewrap_command_is_closed_and_has_no_network(self):
        command = _build_bubblewrap_command(
            bwrap_executable="/usr/bin/bwrap",
            runtime_mounts=[
                RuntimeMount(host_path=Path("/runtime-a"), guest_path=Path("/runtime-a")),
                RuntimeMount(host_path=Path("/runtime-b"), guest_path=Path("/runtime-b")),
            ],
            input_directory=Path("/temporary/inputs"),
            implementation_directory=Path("/temporary/implementation"),
            output_directory=Path("/temporary/outputs"),
            command=["/runtime-a/python", "/implementation/submission.py", "{input:case}", "{output}"],
        )
        self.assertIn("--unshare-all", command)
        self.assertIn("--unshare-net", command)
        self.assertIn("--clearenv", command)
        self.assertIn(["--ro-bind", "/runtime-a", "/runtime-a"], [command[index : index + 3] for index in range(len(command))])
        self.assertIn(["--ro-bind", "/runtime-b", "/runtime-b"], [command[index : index + 3] for index in range(len(command))])
        self.assertIn(["--ro-bind", "/temporary/inputs", "/inputs"], [command[index : index + 3] for index in range(len(command))])
        self.assertIn(
            ["--ro-bind", "/temporary/implementation", "/implementation"],
            [command[index : index + 3] for index in range(len(command))],
        )
        self.assertIn(["--bind", "/temporary/outputs", "/outputs"], [command[index : index + 3] for index in range(len(command))])
        self.assertNotIn(["--ro-bind", "/", "/"], [command[index : index + 3] for index in range(len(command))])

    def test_runtime_mounts_keep_lexical_guest_paths_for_merged_usr_layouts(self):
        mounts = _validate_runtime_mounts(
            ["/usr", "/lib", "/lib64"],
            package_root=self.root,
            source_root=self.source_root,
            reference_source_files=(),
        )
        command = _build_bubblewrap_command(
            bwrap_executable="/usr/bin/bwrap",
            runtime_mounts=mounts,
            input_directory=Path("/temporary/inputs"),
            implementation_directory=Path("/temporary/implementation"),
            output_directory=Path("/temporary/outputs"),
            command=["/usr/bin/python3", "/implementation/submission.py"],
        )
        bindings = [command[index : index + 3] for index in range(len(command))]
        self.assertIn(["--ro-bind", str(Path("/usr").resolve()), "/usr"], bindings)
        self.assertIn(["--ro-bind", str(Path("/lib").resolve()), "/lib"], bindings)
        self.assertIn(["--ro-bind", str(Path("/lib64").resolve()), "/lib64"], bindings)

    def test_isolated_backend_absent_returns_explicit_unavailable_without_fallback(self):
        with (
            patch("corpus_labs.independent_replication.shutil.which", return_value=None),
            patch("corpus_labs.independent_replication.run_projected_submission") as projected,
        ):
            result = run_isolated_submission(
                self.package,
                self.root,
                source_root=self.source_root,
                source_files=["submission.py"],
                command=[sys.executable, "/implementation/submission.py", "{input:case}", "{output}"],
                output_path="report.json",
                runtime_mounts=["/usr"],
            )
        self.assertEqual(result["execution_verdict"], "isolation_unavailable")
        self.assertEqual(result["independence_verdict"], "independence_unknown")
        self.assertIsNone(result["output"])
        projected.assert_not_called()

    def test_isolated_backend_namespace_refusal_returns_explicit_unavailable(self):
        refused = subprocess.CompletedProcess(
            args=["bwrap"],
            returncode=1,
            stdout="",
            stderr="bwrap: Creating new namespace failed: Operation not permitted",
        )
        with (
            # The namespace-refusal branch must not depend on Bubblewrap being
            # installed on the host that runs this unit test.  Resolution is
            # production behavior covered separately by the absent-backend test.
            patch("corpus_labs.independent_replication.shutil.which", return_value=None),
            patch("corpus_labs.independent_replication._resolve_bubblewrap", return_value="/fake/bwrap"),
            patch("corpus_labs.independent_replication.subprocess.run", return_value=refused),
        ):
            result = run_isolated_submission(
                self.package,
                self.root,
                source_root=self.source_root,
                source_files=["submission.py"],
                command=[sys.executable, "/implementation/submission.py", "{input:case}", "{output}"],
                output_path="report.json",
                runtime_mounts=["/usr"],
            )
        self.assertEqual(result["execution_verdict"], "isolation_unavailable")
        self.assertIn("namespace", result["reason"].lower())

    def test_isolated_submission_rejects_reference_source_and_reference_mount(self):
        reference = self.source_root / "reference.py"
        reference.write_text("raise SystemExit(0)\n", encoding="utf-8")
        with self.assertRaisesRegex(ReplicationError, "may not stage"):
            run_isolated_submission(
                self.package,
                self.root,
                source_root=self.source_root,
                source_files=["reference.py"],
                command=[sys.executable, "/implementation/reference.py", "{output}"],
                output_path="report.json",
                runtime_mounts=["/usr"],
                reference_source_files=[reference],
            )
        with self.assertRaisesRegex(ReplicationError, "would expose"):
            run_isolated_submission(
                self.package,
                self.root,
                source_root=self.source_root,
                source_files=["submission.py"],
                command=[sys.executable, "/implementation/submission.py", "{input:case}", "{output}"],
                output_path="report.json",
                runtime_mounts=[self.source_root],
                reference_source_files=[reference],
            )

    def test_isolated_contract_error_is_not_reported_as_backend_unavailable(self):
        with self.assertRaisesRegex(ReplicationError, "host root"):
            run_isolated_submission(
                self.package,
                self.root,
                source_root=self.source_root,
                source_files=["submission.py"],
                command=[sys.executable, "/implementation/submission.py", "{input:case}", "{output}"],
                output_path="report.json",
                runtime_mounts=["/"],
            )
        with self.assertRaisesRegex(ReplicationError, "user home"):
            run_isolated_submission(
                self.package,
                self.root,
                source_root=self.source_root,
                source_files=["submission.py"],
                command=[sys.executable, "/implementation/submission.py", "{input:case}", "{output}"],
                output_path="report.json",
                runtime_mounts=[Path.home().parent],
            )

    def test_public_isolated_api_rejects_caller_fake_backend_before_execution(self):
        fake_backend = self.root / "fake-bwrap"
        fake_backend.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
        self.assertNotIn("bwrap_executable", inspect.signature(run_isolated_submission).parameters)
        with patch("corpus_labs.independent_replication.subprocess.run") as executed:
            with self.assertRaises(TypeError):
                run_isolated_submission(
                    self.package,
                    self.root,
                    source_root=self.source_root,
                    source_files=["submission.py"],
                    command=[sys.executable, "/implementation/submission.py", "{input:case}", "{output}"],
                    output_path="report.json",
                    runtime_mounts=["/usr"],
                    bwrap_executable=str(fake_backend),
                )
        executed.assert_not_called()

    def test_runtime_mounts_reject_protected_ancestors_and_descendants_outside_home(self):
        with tempfile.TemporaryDirectory(dir="/tmp") as temporary:
            root = Path(temporary).resolve()
            self.assertTrue(root.is_relative_to(Path("/tmp")))
            self.assertFalse(root.is_relative_to(Path.home().resolve()))

            repository = root / "repository"
            (repository / ".git").mkdir(parents=True)
            package = repository / "package"
            package.mkdir()
            source = root / "source"
            source.mkdir()
            reference = root / "references" / "reference.py"
            reference.parent.mkdir()
            reference.write_text("pass\n", encoding="utf-8")
            for path in (
                package / "descendant",
                source / "descendant",
                repository / "descendant",
            ):
                path.mkdir()

            protected_relations = {
                "package descendant": package / "descendant",
                "package ancestor": package.parent,
                "source descendant": source / "descendant",
                "source ancestor": source.parent,
                "repository descendant": repository / "descendant",
                "repository ancestor": repository.parent,
                "reference file": reference,
                "reference ancestor": reference.parent,
            }
            for label, candidate in protected_relations.items():
                with self.subTest(label=label, candidate=candidate):
                    with self.assertRaisesRegex(ReplicationError, "would expose a package, source, or reference"):
                        _validate_runtime_mounts(
                            [candidate],
                            package_root=package,
                            source_root=source,
                            reference_source_files=[reference],
                        )

    def test_isolated_attestation_remains_independence_unknown(self):
        report = self.evaluate(
            {"result": "same", "details": {"domain": "unrelated"}},
            separation={
                "mode": "bubblewrap_process_isolation",
                "backend": "bubblewrap",
                "process_isolation_exercised": True,
                "network": "disabled",
                "reference_code_present": False,
                "reference_code_accessible": False,
            },
        )
        self.assertEqual(report["local_separation_verdict"], "process_isolation_exercised")
        self.assertEqual(report["execution_context"]["projection"], "staged_local_projection")
        self.assertEqual(report["execution_context"]["process_isolation"], "exercised")
        self.assertEqual(report["independence_verdict"], "independence_unknown")
        self.assertEqual(report["overall_verdict"], "isolated_local_replication_agrees")

    @unittest.skipUnless(shutil.which("bwrap"), "skipped_unavailable: Bubblewrap is not installed")
    def test_real_bubblewrap_is_conditional_and_skips_when_namespaces_are_unavailable(self):
        system_python = Path("/usr/bin/python3")
        if not system_python.is_file():
            self.skipTest("skipped_unavailable: /usr/bin/python3 is not available for the guest runtime")
        runtime_mounts = [
            str(path)
            for path in (Path("/usr/local"), Path("/usr"), Path("/lib"), Path("/lib64"))
            if path.exists()
        ]
        result = run_isolated_submission(
            self.package,
            self.root,
            source_root=self.source_root,
            source_files=["submission.py"],
            command=[str(system_python), "/implementation/submission.py", "{input:case}", "{output}"],
            output_path="report.json",
            runtime_mounts=runtime_mounts,
        )
        if result["execution_verdict"] == "isolation_unavailable":
            self.skipTest(f"skipped_unavailable: {result['reason']}")
        self.assertEqual(result["execution_verdict"], "process_isolation_exercised")
        self.assertEqual(result["local_separation"]["network"], "disabled")
        self.assertFalse(result["local_separation"]["reference_code_accessible"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
