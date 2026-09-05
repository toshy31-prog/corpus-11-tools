#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from harness import HarnessError, create_run, import_response, invalidate_run, prepare_review, record_review, verify_run  # noqa: E402


class HarnessTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.runtime = Path(self.temp.name)
        create_run(self.runtime, "synthetic-1", "Synthetic fixture prompt")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def response(self, job: str, text: str, notes: str = "") -> None:
        import_response(self.runtime, "synthetic-1", job, text, notes)

    def test_missing_response_refuses_review(self) -> None:
        self.response("chatgpt_custom_gpt", "A synthetic answer")
        with self.assertRaisesRegex(HarnessError, "two sealed"):
            prepare_review(self.runtime, "synthetic-1")

    def test_fixture_catalogue_declares_all_jalon_one_cases(self) -> None:
        catalogue = json.loads((ROOT / "fixtures" / "scenarios.json").read_text(encoding="utf-8"))
        self.assertEqual(catalogue["scope"], "synthetic_only")
        self.assertEqual(
            {scenario["id"] for scenario in catalogue["scenarios"]},
            {"missing-response", "corrupt-response-hash", "identical-responses", "wording-only", "manifest-contradiction"},
        )

    def test_real_non_sensitive_run_is_explicitly_labelled(self) -> None:
        create_run(self.runtime, "real-1", "A non-sensitive question", "real_non_sensitive")
        manifest = json.loads((self.runtime / "real-1" / "manifest.json").read_text(encoding="utf-8"))
        input_data = json.loads((self.runtime / "real-1" / "input.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["purpose"], "real_non_sensitive")
        self.assertEqual(input_data["sensitivity"], "non_sensitive")
        self.assertEqual(manifest["executor_profiles"]["chatgpt_custom_gpt"]["context_status"], "fresh_session_configured_gpt")
        self.assertEqual(manifest["executor_profiles"]["codex_corpus"]["context_status"], "loaded_repository_and_corpus")

    def test_corrupt_hash_is_refused(self) -> None:
        self.response("chatgpt_custom_gpt", "A synthetic answer")
        self.response("codex_corpus", "Another synthetic answer")
        path = self.runtime / "synthetic-1" / "jobs" / "codex_corpus" / "response.json"
        data = json.loads(path.read_text(encoding="utf-8")); data["response_sha256"] = "0" * 64
        path.write_text(json.dumps(data), encoding="utf-8")
        with self.assertRaisesRegex(HarnessError, "integrity"):
            verify_run(self.runtime, "synthetic-1")

    def test_identical_answers_are_reviewable_and_notes_are_excluded(self) -> None:
        self.response("chatgpt_custom_gpt", "Same fixture answer", "interface visibly truncated")
        self.response("codex_corpus", "Same fixture answer")
        packet = json.loads(prepare_review(self.runtime, "synthetic-1").read_text(encoding="utf-8"))
        self.assertEqual({row["response_text"] for row in packet["answers"].values()}, {"Same fixture answer"})
        self.assertFalse(packet["operator_notes_included"])
        self.assertNotIn("interface visibly truncated", json.dumps(packet))

    def test_wording_and_contradictory_answers_remain_reviewable_without_verdict(self) -> None:
        self.response("chatgpt_custom_gpt", "The answer is yes, subject to the stated condition.")
        self.response("codex_corpus", "No: the stated condition is not satisfied.")
        packet = json.loads(prepare_review(self.runtime, "synthetic-1").read_text(encoding="utf-8"))
        self.assertIsNone(packet["automated_verdict"])
        self.assertEqual(len({row["response_text"] for row in packet["answers"].values()}), 2)

    def test_blind_mapping_is_not_exposed_in_review_packet(self) -> None:
        self.response("chatgpt_custom_gpt", "One")
        self.response("codex_corpus", "Two")
        packet_path = prepare_review(self.runtime, "synthetic-1")
        packet = json.loads(packet_path.read_text(encoding="utf-8"))
        public_manifest = (self.runtime / "synthetic-1" / "manifest.json").read_text(encoding="utf-8")
        self.assertEqual(set(packet["answers"]), {"A", "B"})
        self.assertNotIn("blind_mapping", public_manifest)

    def test_human_review_is_explicit_blind_and_does_not_retain_response_text(self) -> None:
        self.response("chatgpt_custom_gpt", "One answer")
        self.response("codex_corpus", "Other answer")
        prepare_review(self.runtime, "synthetic-1")
        review = json.loads(record_review(self.runtime, "synthetic-1", "A", ["conclusion_supported", "scope_preserved"]).read_text(encoding="utf-8"))
        manifest = json.loads((self.runtime / "synthetic-1" / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(review["decision"], "A")
        self.assertFalse(review["automated_verdict"])
        self.assertNotIn("One answer", json.dumps(review))
        self.assertNotIn("Other answer", json.dumps(review))
        self.assertEqual(manifest["status"], "reviewed")

    def test_human_review_requires_prepared_packet_and_known_criteria(self) -> None:
        with self.assertRaisesRegex(HarnessError, "prepared blind"):
            record_review(self.runtime, "synthetic-1", "A", ["conclusion_supported"])
        self.response("chatgpt_custom_gpt", "One")
        self.response("codex_corpus", "Two")
        prepare_review(self.runtime, "synthetic-1")
        with self.assertRaisesRegex(HarnessError, "known review criterion"):
            record_review(self.runtime, "synthetic-1", "A", ["looks_good"])

    def test_sealed_response_cannot_be_replaced(self) -> None:
        self.response("chatgpt_custom_gpt", "First")
        job = json.loads((self.runtime / "synthetic-1" / "jobs" / "chatgpt_custom_gpt" / "job.json").read_text(encoding="utf-8"))
        self.assertEqual(job["attempt_id"], 1)
        with self.assertRaisesRegex(HarnessError, "cannot be replaced"):
            self.response("chatgpt_custom_gpt", "Replacement")

    def test_invalidation_prevents_review(self) -> None:
        invalidate_run(self.runtime, "synthetic-1", "fixture label correction")
        with self.assertRaisesRegex(HarnessError, "two sealed"):
            prepare_review(self.runtime, "synthetic-1")


if __name__ == "__main__":
    unittest.main()
