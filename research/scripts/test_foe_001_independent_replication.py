#!/usr/bin/env python3
"""Use FOE-001 unchanged as the first real independent-replication adapter."""

from __future__ import annotations

import json
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "corpus-11-tools/labs/python"))
sys.path.insert(0, str(ROOT / "research"))

from corpus_labs.independent_replication import (
    ATTESTATION_SCHEMA,
    FROZEN_PACKAGE_SCHEMA,
    OUTPUT_CONTRACT_SCHEMA,
    evaluate_replication,
    run_projected_submission,
    sha256_file,
    sha256_value,
)
import foe_001_replication_adapter


PROTOCOL = ROOT / "research/FOUNDATIONS_OF_EVIDENCE_PROTOCOL_v0.1.md"
FIXTURE = ROOT / "research/fixtures/foundations_of_evidence_foe_001.json"
SECOND_SOURCE = ROOT / "research/foe_001_second_implementation/foe001_independent.py"


class Foe001IndependentReplicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
        cls.package = {
            "schema": FROZEN_PACKAGE_SCHEMA,
            "package_id": "FOE-001-frozen-replication-package",
            "inputs": [
                {"id": "protocol", "path": "research/FOUNDATIONS_OF_EVIDENCE_PROTOCOL_v0.1.md", "sha256": sha256_file(PROTOCOL)},
                {"id": "fixture", "path": "research/fixtures/foundations_of_evidence_foe_001.json", "sha256": sha256_file(FIXTURE)},
            ],
            "allowed_input_ids": ["protocol", "fixture"],
        }
        cls.output_contract = {
            "schema": OUTPUT_CONTRACT_SCHEMA,
            "comparable_paths": [
                "/protocol_id",
                "/lineage_results",
                "/provenance/core_fields_preserved",
                "/provenance/collision",
                "/provenance/extension",
                "/migration_results",
            ],
        }

    @staticmethod
    def _attestation(*, role: str, implementation_id: str, output: dict, dependencies: list[dict], local_separation=None) -> dict:
        record = {
            "schema": ATTESTATION_SCHEMA,
            "implementation_id": implementation_id,
            "role": role,
            "environment": {"runtime": f"Python {sys.version.split()[0]}", "packages": []},
            "declared_input_ids": ["protocol", "fixture"],
            "observed_input_ids": ["protocol", "fixture"],
            "declared_dependencies": dependencies,
            "observed_dependencies": dependencies,
            "output": output,
            "output_sha256": sha256_value(output),
        }
        if local_separation is not None:
            record["local_separation"] = local_separation
        return record

    def test_attestation_helper_is_callable_without_a_test_instance(self):
        output = {"status": "frozen"}
        dependencies = [{"id": "python-standard-library", "fingerprint": "sha256:" + "1" * 64}]
        separation = {
            "mode": "bubblewrap_process_isolation",
            "process_isolation_exercised": True,
            "network": "disabled",
            "reference_code_present": False,
            "reference_code_accessible": False,
        }
        attestation = type(self)._attestation(
            role="separate",
            implementation_id="FOE-001-second-implementation",
            output=output,
            dependencies=dependencies,
            local_separation=separation,
        )
        self.assertEqual(attestation["role"], "separate")
        self.assertEqual(attestation["output_sha256"], sha256_value(output))
        self.assertEqual(attestation["local_separation"], separation)

    def test_foe_001_agrees_under_a_local_projection_without_external_claim(self):
        reference_output = foe_001_replication_adapter.run_fixture(self.fixture)
        projected = run_projected_submission(
            self.package,
            ROOT,
            source_root=SECOND_SOURCE.parent,
            source_files=[SECOND_SOURCE.name],
            command=[sys.executable, "implementation/foe001_independent.py", "--protocol", "{input:protocol}", "--fixture", "{input:fixture}", "--write-report", "{output}"],
            output_path="foe-001-second-report.json",
            reference_source_files=[ROOT / "research/scripts/test_foundations_of_evidence.py", *foe_001_replication_adapter.ADAPTERS.values()],
        )
        reference_dependencies = [
            {"id": "python-standard-library", "fingerprint": "sha256:" + "1" * 64},
            {"id": "foe-001-reference-adapters", "fingerprint": sha256_value({key: sha256_file(path) for key, path in foe_001_replication_adapter.ADAPTERS.items()})},
        ]
        separate_dependencies = [
            {"id": "python-standard-library", "fingerprint": "sha256:" + "1" * 64},
            {"id": "foe-001-separate-source", "fingerprint": sha256_file(SECOND_SOURCE)},
        ]
        report = evaluate_replication(
            self.package,
            ROOT,
            self.output_contract,
            self._attestation(role="reference", implementation_id="FOE-001-four-adapter-reference", output=reference_output, dependencies=reference_dependencies),
            self._attestation(role="separate", implementation_id="FOE-001-second-implementation", output=projected["output"], dependencies=separate_dependencies, local_separation=projected["local_separation"]),
        )
        self.assertEqual(report["comparison"]["comparison_verdict"], "matching_output")
        self.assertEqual(report["local_separation_verdict"], "local_projection_tested")
        self.assertEqual(report["independence_verdict"], "independence_unknown")
        self.assertEqual(report["overall_verdict"], "local_replication_agrees")
        self.assertEqual(report["shared_declared_dependencies"], [{"id": "python-standard-library", "fingerprint": "sha256:" + "1" * 64}])


if __name__ == "__main__":
    unittest.main(verbosity=2)
