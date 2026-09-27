import copy
import unittest

from memory_quarantine import quarantine, validate, review_candidates

ENTRY = {"id": "import-1", "note_sha256": "a" * 64,
         "source": {"kind": "conversation_archive", "reference_sha256": "b" * 64},
         "source_confidence": "external_untrusted"}


class MemoryQuarantineTests(unittest.TestCase):
    def test_every_import_is_quarantined_without_injection_or_core_promotion(self):
        manifest = quarantine([ENTRY])
        note = manifest["notes"][0]
        self.assertEqual(note["state"], "quarantined")
        self.assertEqual(note["target_tier"], "quarantine")
        self.assertFalse(note["automatic_injection"])
        self.assertEqual(note["core_promotion"], "not_supported")
        self.assertTrue(validate(manifest)["valid"])
        self.assertFalse(manifest["writes_performed"])

    def test_review_can_only_propose_explicit_recall_selection(self):
        manifest = quarantine([ENTRY])
        result = review_candidates(manifest, [{"id": "import-1", "note_sha256": "a" * 64,
                                               "reviewer_declared": "local_user", "decision": "propose_recall"}])
        row = result["reviewed"][0]
        self.assertEqual(row["next_state"], "manual_recall_selection_required")
        self.assertEqual(row["target_tier"], "quarantine")
        self.assertEqual(row["core_promotion"], "not_supported")
        self.assertIsNone(result["verified_result"])

    def test_rejects_stale_or_core_promotion_attempts(self):
        manifest = quarantine([ENTRY])
        changed = copy.deepcopy(manifest)
        changed["notes"][0]["target_tier"] = "core"
        with self.assertRaises(ValueError):
            validate(changed)
        with self.assertRaisesRegex(ValueError, "rappel"):
            review_candidates(manifest, [{"id": "import-1", "note_sha256": "a" * 64,
                                          "reviewer_declared": "local_user", "decision": "promote_core"}])


if __name__ == "__main__":
    unittest.main()
