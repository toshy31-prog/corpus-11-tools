"""Non-regression tests for the real P001/P002 Corpus-backed runners.

The committed summaries were produced by the former project-local
orchestration and are immutable numerical oracles here. P001-DT-001/002 kept
older verdict/report snapshots after their verdict code evolved, so those two
cases lock the pre-extraction current logic separately instead of rewriting
the historical artifacts.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest

from run_p001 import execute as execute_p001
from run_p001 import load_config, verdict as verdict_p001, write_report as write_report_p001
from run_p002 import execute as execute_p002
from run_p002 import make_verdict as verdict_p002, write_report as write_report_p002


ROOT = Path(__file__).resolve().parent
CURRENT_P001_LOGIC = {
    "p001_config.json": {
        "verdict": "eb6dcd3a8ec203d78c518118b7deec2920037e4b7c9bdd3ca972eeed524e614d",
        "report": "49b24eecadc78b1fbd96a462db8dd2bd6e668f47715e5d707e4ed01860fef20e",
    },
    "p001_config_v2.json": {
        "verdict": "112cdc08982f11cc2f45f2637bd13901eded15905920a41ddc969d2e97e2aa75",
        "report": "017fc45255deeceade07a5491a05f088b15acae2e9cf019a3be40ea7b4f36564",
    },
}


def csv_text(rows: list[dict[str, object]]) -> str:
    handle = io.StringIO(newline="")
    writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return handle.getvalue()


class CampaignExtractionEquivalenceTests(unittest.TestCase):
    def assert_historical_equivalence(
        self,
        *,
        config_name: str,
        results_name: str,
        execute,
        make_verdict,
        write_report,
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
            expected_verdict = json.loads((results / "verdict.json").read_text(encoding="utf-8"))
            self.assertEqual(outcome, expected_verdict)
        else:
            canonical = json.dumps(outcome, sort_keys=True, separators=(",", ":")).encode()
            self.assertEqual(hashlib.sha256(canonical).hexdigest(), current_logic["verdict"])

        with tempfile.TemporaryDirectory() as directory:
            actual_report = Path(directory) / "report.md"
            write_report(rows, outcome, config, actual_report)
            if current_logic is None:
                self.assertEqual(
                    actual_report.read_text(encoding="utf-8"),
                    (results / "report.md").read_text(encoding="utf-8"),
                )
            else:
                self.assertEqual(
                    hashlib.sha256(actual_report.read_bytes()).hexdigest(),
                    current_logic["report"],
                )

    def test_p001_all_historical_protocols(self) -> None:
        cases = (
            ("p001_config.json", "results-p001"),
            ("p001_config_v2.json", "results-p001-v2"),
            ("p001_config_v3.json", "results-p001-v3"),
        )
        for config_name, results_name in cases:
            with self.subTest(config=config_name):
                self.assert_historical_equivalence(
                    config_name=config_name,
                    results_name=results_name,
                    execute=execute_p001,
                    make_verdict=verdict_p001,
                    write_report=write_report_p001,
                    current_logic=CURRENT_P001_LOGIC.get(config_name),
                )

    def test_p002_all_historical_protocols(self) -> None:
        cases = (
            ("p002_config.json", "results-p002"),
            ("p002_config_v2.json", "results-p002-v2"),
        )
        for config_name, results_name in cases:
            with self.subTest(config=config_name):
                self.assert_historical_equivalence(
                    config_name=config_name,
                    results_name=results_name,
                    execute=execute_p002,
                    make_verdict=verdict_p002,
                    write_report=write_report_p002,
                )


if __name__ == "__main__":
    unittest.main()
