#!/usr/bin/env python3
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RUNNER_PATH = ROOT / "research/scripts/run_product_query_evaluation_v0.py"
SPEC = importlib.util.spec_from_file_location("product_query_runner", RUNNER_PATH)
runner = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(runner)


class ProductQueryCampaignTests(unittest.TestCase):
    def test_b_runs_but_a_is_explicitly_blocked_by_rejected_router(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "campaign"
            manifest = runner.run_campaign(
                runner.DEFAULT_PROTOCOL,
                runner.DEFAULT_FIXTURE,
                runner.DEFAULT_ROUTER_REPORT,
                runner.DEFAULT_ROUTER_MODEL,
                runner.DEFAULT_ROUTER_SCRIPT,
                output,
            )
            self.assertEqual(manifest["overall_status"], "incomplete_arm_a_blocked_arm_b_verified")
            self.assertEqual(manifest["arm_a"]["status"], "blocked_model_not_selected")
            self.assertEqual(manifest["arm_a"]["outputs_attempted"], 0)
            self.assertEqual(manifest["arm_a"]["router_binding"]["selection_status"], "experimental_not_preferred")
            self.assertEqual(manifest["arm_b"]["packet_count"], 18)
            self.assertEqual(manifest["arm_b"]["render_count"], 54)
            self.assertTrue((output / "manifest.json").is_file())
            self.assertTrue((output / "arm-b-packets" / "manifest.json").is_file())
            self.assertTrue((output / "arm-b-renders" / "manifest.json").is_file())
            stored = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(stored["manifest_sha256"], manifest["manifest_sha256"])

    def test_refuses_to_overwrite_a_campaign(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "campaign"
            runner.run_campaign(runner.DEFAULT_PROTOCOL, runner.DEFAULT_FIXTURE, runner.DEFAULT_ROUTER_REPORT, runner.DEFAULT_ROUTER_MODEL, runner.DEFAULT_ROUTER_SCRIPT, output)
            with self.assertRaises(FileExistsError):
                runner.run_campaign(runner.DEFAULT_PROTOCOL, runner.DEFAULT_FIXTURE, runner.DEFAULT_ROUTER_REPORT, runner.DEFAULT_ROUTER_MODEL, runner.DEFAULT_ROUTER_SCRIPT, output)


if __name__ == "__main__":
    unittest.main(verbosity=2)
