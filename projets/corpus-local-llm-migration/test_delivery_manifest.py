import copy
import json
import unittest
from pathlib import Path

from delivery_manifest import HERE, load_and_validate, validate


class DeliveryManifestTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((HERE / "DELIVERY_MANIFEST.json").read_text(encoding="utf-8"))

    def test_manifest_is_content_free_and_auditable(self):
        result = load_and_validate()
        self.assertTrue(result["manifest_valid"])
        self.assertEqual(result["execution"], "not_started")
        self.assertGreaterEqual(result["status_counts"]["verified_static"], 1)
        self.assertGreaterEqual(result["status_counts"]["observed_bounded"], 1)
        self.assertGreaterEqual(result["status_counts"]["prepared_not_executed"], 1)
        rendered = json.dumps(self.data, ensure_ascii=False).lower()
        for forbidden in ("ses_", "msg_", "prt_", "/home/", "http://", "https://"):
            self.assertNotIn(forbidden, rendered)

    def test_hash_drift_and_unsafe_path_are_rejected(self):
        broken = copy.deepcopy(self.data)
        broken["entries"][0]["sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "entry_hash_mismatch"):
            validate(broken)
        broken = copy.deepcopy(self.data)
        broken["entries"][0]["path"] = "../outside"
        with self.assertRaisesRegex(ValueError, "entry_path_not_relative"):
            validate(broken)

    def test_manifest_cannot_claim_lot_execution(self):
        broken = copy.deepcopy(self.data)
        broken["execution"] = "completed"
        with self.assertRaisesRegex(ValueError, "must_not_claim_execution"):
            validate(broken)


if __name__ == "__main__":
    unittest.main()
