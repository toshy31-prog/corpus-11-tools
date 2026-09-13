#!/usr/bin/env python3
"""Second local adoption of the generic independent replication harness."""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[4]
LAB = ROOT / "research/active/provenance-interoperability-lab"
sys.path.insert(0, str(ROOT / "corpus-11-tools/labs/python"))
sys.path.insert(0, str(LAB))

from corpus_labs.independent_replication import (
    ATTESTATION_SCHEMA,
    FROZEN_PACKAGE_SCHEMA,
    evaluate_replication,
    run_projected_submission,
    sha256_file,
    sha256_value,
)
import replication_reference_adapter


PROTOCOL = LAB / "protocols/core_mutations_v0.2.md"
FIXTURE = LAB / "fixtures/core_mutations_v0.2.json"
CONTRACT_PATH = LAB / "replication/output_contract.json"
SECOND_SOURCE = LAB / "second_implementation/provenance_independent.py"


class ProvenanceIndependentReplicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
        cls.contract = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
        cls.package = {
            "schema": FROZEN_PACKAGE_SCHEMA,
            "package_id": "provenance-interoperability-core-mutations-v0.2",
            "inputs": [
                {"id": "protocol", "path": str(PROTOCOL.relative_to(ROOT)), "sha256": sha256_file(PROTOCOL)},
                {"id": "fixture", "path": str(FIXTURE.relative_to(ROOT)), "sha256": sha256_file(FIXTURE)},
                {"id": "output-contract", "path": str(CONTRACT_PATH.relative_to(ROOT)), "sha256": sha256_file(CONTRACT_PATH)},
            ],
            "allowed_input_ids": ["protocol", "fixture", "output-contract"],
        }
        cls.reference_output = replication_reference_adapter.run_fixture(cls.fixture, cls.contract)
        cls.projected = run_projected_submission(
            cls.package,
            ROOT,
            source_root=SECOND_SOURCE.parent,
            source_files=[SECOND_SOURCE.name],
            command=[
                sys.executable,
                "implementation/provenance_independent.py",
                "--protocol",
                "{input:protocol}",
                "--fixture",
                "{input:fixture}",
                "--contract",
                "{input:output-contract}",
                "--write-report",
                "{output}",
            ],
            output_path="provenance-second-report.json",
            reference_source_files=[
                LAB / "tests/test_core_mutations.py",
                LAB / "tests/test_initial_protocol.py",
                LAB / "replication_reference_adapter.py",
            ],
        )

    def _attestation(self, role: str, output: dict, dependencies: list[dict], local_separation=None) -> dict:
        record = {
            "schema": ATTESTATION_SCHEMA,
            "implementation_id": f"provenance-{role}-v0.2",
            "role": role,
            "environment": {"runtime": f"Python {sys.version.split()[0]}", "packages": []},
            "declared_input_ids": ["protocol", "fixture", "output-contract"],
            "observed_input_ids": ["protocol", "fixture", "output-contract"],
            "declared_dependencies": dependencies,
            "observed_dependencies": dependencies,
            "output": output,
            "output_sha256": sha256_value(output),
        }
        if local_separation is not None:
            record["local_separation"] = local_separation
        return record

    def _report(self, separate_output=None, separation=None) -> dict:
        reference_dependencies = [
            {"id": "python-standard-library", "fingerprint": "sha256:" + "3" * 64},
            {"id": "provenance-reference", "fingerprint": sha256_file(LAB / "tests/test_core_mutations.py")},
        ]
        separate_dependencies = [
            {"id": "python-standard-library", "fingerprint": "sha256:" + "3" * 64},
            {"id": "provenance-separate", "fingerprint": sha256_file(SECOND_SOURCE)},
        ]
        return evaluate_replication(
            self.package,
            ROOT,
            self.contract,
            self._attestation("reference", self.reference_output, reference_dependencies),
            self._attestation(
                "separate",
                self.projected["output"] if separate_output is None else separate_output,
                separate_dependencies,
                self.projected["local_separation"] if separation is None else separation,
            ),
        )

    def test_separate_provenance_implementation_agrees_without_independence_claim(self):
        report = self._report()
        self.assertEqual(report["comparison"]["comparison_verdict"], "matching_output")
        self.assertEqual(report["local_separation_verdict"], "local_projection_tested")
        self.assertEqual(report["independence_verdict"], "independence_unknown")
        self.assertEqual(report["overall_verdict"], "local_replication_agrees")
        self.assertEqual(report["shared_declared_dependencies"], [{"id": "python-standard-library", "fingerprint": "sha256:" + "3" * 64}])
        output = self.projected["output"]
        self.assertTrue(output["core"]["baseline_preserved"])
        self.assertEqual(output["collision"]["verdict"], "rejected")
        self.assertEqual(output["extension"]["status"], "loss_explicitly_located")
        self.assertEqual(len(output["mutation_results"]), 15)
        self.assertTrue(all(item["detected_by_all_profiles"] for item in output["mutation_results"]))

    def test_specific_negative_controls_remain_visible(self):
        cases = []
        core_lost = deepcopy(self.projected["output"])
        core_lost["core"]["baseline_preserved"] = False
        cases.append(("core", core_lost, "/core"))
        collision_absorbed = deepcopy(self.projected["output"])
        collision_absorbed["collision"]["verdict"] = "absorbed"
        cases.append(("collision", collision_absorbed, "/collision"))
        extension_silent = deepcopy(self.projected["output"])
        extension_silent["extension"]["status"] = "lost_silently"
        cases.append(("extension", extension_silent, "/extension"))
        mutation_undetectable = deepcopy(self.projected["output"])
        mutation_undetectable["mutation_results"][0]["detected_by_all_profiles"] = False
        cases.append(("mutation", mutation_undetectable, "/mutation_results"))
        for label, output, pointer in cases:
            with self.subTest(label=label):
                report = self._report(output)
                self.assertEqual(report["comparison"]["comparison_verdict"], "divergent_output")
                self.assertEqual(report["comparison"]["differences"][0]["path"], pointer)

        incomplete = deepcopy(self.projected["output"])
        del incomplete["mutation_results"]
        report = self._report(incomplete)
        self.assertEqual(report["comparison"]["comparison_verdict"], "incomplete_output")
        self.assertEqual(report["comparison"]["missing_output_paths"], [{"implementation": "separate", "path": "/mutation_results"}])

        accessible = deepcopy(self.projected["local_separation"])
        accessible["reference_code_accessible"] = True
        report = self._report(separation=accessible)
        self.assertEqual(report["local_separation_verdict"], "reference_code_accessible")
        self.assertEqual(report["overall_verdict"], "local_replication_not_established")


if __name__ == "__main__":
    unittest.main(verbosity=2)
