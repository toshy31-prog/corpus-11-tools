"""Strict non-regression tests for the real P005 Corpus-backed runner."""

from __future__ import annotations

import csv
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest

from run_p001 import load_config
from run_p005 import execute, make_verdict, write_report
from run_p005_robustness import audit


ROOT = Path(__file__).resolve().parent
P005_V1_CURRENT_LOGIC = {
    "verdict": "933bbf997821d5048c37a5116647c28bfe9ea97eee6e4230767473d23d481366",
    "report": "aa8f0e1fd307ea46e9c56273ee969f23fc248cf83e60c3d9759ed9388f993107",
}


def csv_text(rows: list[dict[str, object]]) -> str:
    handle = io.StringIO(newline="")
    writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return handle.getvalue()


class P005CampaignRunnerTests(unittest.TestCase):
    def assert_artifacts(
        self,
        config_name: str,
        results_name: str,
        current_logic: dict[str, str] | None = None,
    ) -> None:
        config = load_config(ROOT / config_name)
        results = ROOT / results_name
        rows = execute(config)
        self.assertEqual(
            csv_text(rows),
            (results / "summary.csv").read_text(encoding="utf-8"),
        )

        outcome = make_verdict(rows, config)
        if current_logic is None:
            expected = json.loads((results / "verdict.json").read_text(encoding="utf-8"))
            self.assertEqual(outcome, expected)
        else:
            canonical = json.dumps(outcome, sort_keys=True, separators=(",", ":")).encode()
            self.assertEqual(hashlib.sha256(canonical).hexdigest(), current_logic["verdict"])

        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "report.md"
            write_report(rows, outcome, config, report)
            if current_logic is None:
                self.assertEqual(
                    report.read_text(encoding="utf-8"),
                    (results / "report.md").read_text(encoding="utf-8"),
                )
            else:
                self.assertEqual(
                    hashlib.sha256(report.read_bytes()).hexdigest(),
                    current_logic["report"],
                )

    def test_all_historical_protocols(self) -> None:
        self.assert_artifacts("p005_config.json", "results-p005", P005_V1_CURRENT_LOGIC)
        self.assert_artifacts("p005_config_v2.json", "results-p005-v2")

    def test_robustness_uses_runner_and_matches_historical_campaign(self) -> None:
        config = load_config(ROOT / "p005_config_v2.json")
        expected = json.loads(
            (ROOT / "results-p005-robustness" / "results.json").read_text(encoding="utf-8")
        )
        self.assertEqual(audit(config, runs=180), expected)

    def test_product_runner_has_no_p005_branch(self) -> None:
        source = (
            ROOT.parents[3]
            / "corpus-11-tools"
            / "labs"
            / "python"
            / "corpus_labs"
            / "simulation_campaign.py"
        ).read_text(encoding="utf-8")
        self.assertNotIn("P005", source)


if __name__ == "__main__":
    unittest.main()
