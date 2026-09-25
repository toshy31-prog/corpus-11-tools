import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from autonomy_yield import assess, telemetry


class YieldTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.contract = {"request_id": "r1", "request": "Corriger une reprise",
                         "quality_contract": "Préserver les effets acquis",
                         "criteria": {"resume": "Reprise vérifiée", "stop": "Arrêt utilisable"}}
        self.hash = hashlib.sha256(json.dumps(self.contract, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        (self.root / "proof.txt").write_text("verified result")
        self.receipt = {"request_id": "r1", "contract_sha256": self.hash, "step_id": "s1",
                        "turn_ids": ["t1"], "criteria": ["resume"], "quality_passed": True,
                        "evidence": [{"path": "proof.txt", "sha256": hashlib.sha256(b"verified result").hexdigest()}]}
        self.trace = {"turns": [{"turn_id": "t1", "completed": True, "tokens": {"processed_tokens": 1200}},
                                {"turn_id": "t2", "completed": True, "tokens": {"processed_tokens": 800}}]}

    def scan(self, rows):
        p = self.root / "trace.jsonl"
        p.write_text("\n".join(json.dumps(x) for x in rows) + "\n")
        return telemetry(p)

    def rows(self):
        return [
            {"type": "event_msg", "payload": {"type": "task_started", "turn_id": "t1"}},
            {"type": "token_usage_record", "payload": {"turn_id": "t1", "response_id": "resp1", "usage": {
                "input_tokens": 1000, "cached_input_tokens": 900, "output_tokens": 200, "reasoning_output_tokens": 50}}},
            {"type": "event_msg", "payload": {"type": "task_complete", "turn_id": "t1"}}]

    def test_token_accounting_no_double_count_cache_reasoning_or_events(self):
        rows = self.rows()
        rows.insert(2, rows[1])
        rows.insert(3, {"type": "event_msg", "payload": {"type": "token_count", "info": {"total_tokens": 99999}}})
        result = self.scan(rows)["turns"][0]
        self.assertEqual(result["tokens"]["processed_tokens"], 1200)
        self.assertEqual(result["tokens"]["uncached_input_tokens"], 100)
        self.assertEqual(result["model_responses"], 1)
        self.assertTrue(result["empty_completed_cycle"])

    def test_unknown_is_not_zero(self):
        r = self.scan([self.rows()[0], self.rows()[-1]])["turns"][0]
        self.assertIsNone(r["tokens"]["processed_tokens"])
        self.assertEqual(r["usage_status"], "unknown")

    def test_malformed_turn_identifiers_do_not_crash_or_reassign_events(self):
        for bad in (["PRIVATE"], {"PRIVATE": 1}, True, 7, None, " "):
            with self.subTest(bad=bad):
                rows = self.rows()[:2]
                rows += [{"type": "event_msg", "payload": {"type": "task_started", "turn_id": bad}},
                         {"type": "event_msg", "payload": {"type": "task_complete"}},
                         {"type": "token_usage_record", "payload": {"turn_id": bad, "response_id": "r"}}]
                result = self.scan(rows)
                self.assertEqual(result["malformed_lines"], 2)
                self.assertEqual(len(result["turns"]), 1)
                self.assertFalse(result["turns"][0]["completed"])
                self.assertNotIn("PRIVATE", json.dumps(result))

    def test_malformed_response_identifier_invalidates_cost_and_preserves_next_turn(self):
        for bad in (["PRIVATE"], {"PRIVATE": 1}, True, 7, None, " "):
            with self.subTest(bad=bad):
                rows = self.rows()
                broken = json.loads(json.dumps(rows[1]))
                broken["payload"]["response_id"] = bad
                rows.insert(2, broken)
                rows.append({"type": "event_msg", "payload": {"type": "task_started", "turn_id": "t2"}})
                result = self.scan(rows)
                self.assertEqual(result["malformed_lines"], 1)
                self.assertEqual(result["turns"][0]["usage_status"], "invalid")
                self.assertIsNone(result["turns"][0]["tokens"]["processed_tokens"])
                self.assertEqual(result["turns"][1]["turn_id"], "t2")
                self.assertNotIn("PRIVATE", json.dumps(result))

    def test_replayed_start_preserves_cost_activity_and_completion(self):
        rows = self.rows()
        rows.insert(2, {"type": "response_item", "payload": {
            "type": "function_call", "call_id": "c1"}})
        expected = self.scan(rows)
        # A replay after completion must not reopen or erase the same turn.
        rows.append(rows[0])
        self.assertEqual(self.scan(rows), expected)
        # Replaying the whole trace must also remain idempotent.
        self.assertEqual(self.scan(rows + rows), expected)

    def test_replayed_start_cannot_hide_conflicting_usage(self):
        rows = self.rows()
        conflict = json.loads(json.dumps(rows[1]))
        conflict["payload"]["usage"]["input_tokens"] += 1
        rows[2:2] = [rows[0], conflict]
        result = self.scan(rows)["turns"][0]
        self.assertEqual(result["usage_status"], "invalid")
        self.assertIsNone(result["tokens"]["processed_tokens"])

    def test_impossible_cache_or_conflicting_duplicate_invalidates_cost(self):
        rows = self.rows()
        rows[1]["payload"]["usage"]["cached_input_tokens"] = 1100
        self.assertEqual(self.scan(rows)["turns"][0]["usage_status"], "invalid")
        rows = self.rows()
        other = json.loads(json.dumps(rows[1]))
        other["payload"]["usage"]["input_tokens"] += 1
        rows.insert(2, other)
        self.assertIsNone(self.scan(rows)["turns"][0]["tokens"]["processed_tokens"])

    def test_nested_tool_events_not_counted_twice_and_no_text_leaks(self):
        rows = self.rows()
        rows.insert(2, {"type": "response_item", "payload": {"type": "custom_tool_call", "call_id": "c1", "input": "PRIVATE"}})
        rows.insert(3, {"type": "event_msg", "payload": {"type": "item_completed", "item": {"type": "CommandExecution", "command": "PRIVATE"}}})
        r = self.scan(rows)
        self.assertEqual(r["turns"][0]["tool_calls"], 1)
        self.assertFalse(r["turns"][0]["empty_completed_cycle"])
        self.assertNotIn("PRIVATE", json.dumps(r))

    def test_criterion_cannot_be_farmed_by_splitting_steps(self):
        second = {**self.receipt, "step_id": "s2", "turn_ids": ["t2"]}
        result = assess(self.contract, [self.receipt, second], self.trace, self.root)
        self.assertEqual(result["supported_criteria"], ["resume"])
        self.assertEqual(result["tokens_per_supported_criterion"], 2000)
        self.assertEqual(result["steps"][1]["decision"], "review_marginal_value")

    def test_quality_cannot_be_traded_for_tokens(self):
        self.receipt["quality_passed"] = False
        r = assess(self.contract, [self.receipt], self.trace, self.root)
        self.assertEqual(r["supported_criteria"], [])
        self.assertIsNone(r["tokens_per_supported_criterion"])

    def test_changed_evidence_removes_support(self):
        (self.root / "proof.txt").write_text("changed")
        self.assertEqual(assess(self.contract, [self.receipt], self.trace, self.root)["supported_criteria"], [])

    def test_later_failed_recheck_withdraws_previous_gain(self):
        failed = {**self.receipt, "step_id": "regression", "turn_ids": ["t2"], "quality_passed": False}
        r = assess(self.contract, [self.receipt, failed], self.trace, self.root)
        self.assertEqual(r["supported_criteria"], [])
        self.assertEqual(r["steps"][1]["invalidated_criteria"], ["resume"])
        self.assertEqual(r["attributed_processed_tokens"], 2000)

    def test_no_path_escape_or_symlink_escape(self):
        self.receipt["evidence"][0]["path"] = "../outside"
        self.assertFalse(assess(self.contract, [self.receipt], self.trace, self.root)["steps"][0]["evidence_bound"])
        (self.root / "link").symlink_to(Path(__file__).resolve())
        self.receipt["evidence"][0]["path"] = "link"
        self.assertFalse(assess(self.contract, [self.receipt], self.trace, self.root)["steps"][0]["evidence_bound"])

    def test_request_or_contract_change_cannot_reuse_progress(self):
        self.contract["request"] = "Une autre demande"
        with self.assertRaises(ValueError):
            assess(self.contract, [self.receipt], self.trace, self.root)

    def test_double_spend_tokens_rejected(self):
        with self.assertRaises(ValueError):
            assess(self.contract, [self.receipt, self.receipt], self.trace, self.root)

    def test_omitting_attempts_prevents_request_level_ratio(self):
        r = assess(self.contract, [self.receipt], self.trace, self.root)
        self.assertEqual(r["unattributed_turn_ids"], ["t2"])
        self.assertIsNone(r["tokens_per_supported_criterion"])

    def test_matched_scope_allows_bounded_ratio(self):
        self.trace["turns"] = self.trace["turns"][:1]
        r = assess(self.contract, [self.receipt], self.trace, self.root)
        self.assertEqual(r["tokens_per_supported_criterion"], 1200)

    def test_missing_or_unfinished_turn_prevents_ratio(self):
        for turns in ([], [{"turn_id": "t1", "completed": False, "tokens": {"processed_tokens": 3}}]):
            r = assess(self.contract, [self.receipt], {"turns": turns}, self.root)
            self.assertIsNone(r["tokens_per_supported_criterion"])

    def test_unplanned_criterion_rejected(self):
        self.receipt["criteria"] = ["lots_of_files"]
        with self.assertRaises(ValueError):
            assess(self.contract, [self.receipt], self.trace, self.root)


if __name__ == "__main__":
    unittest.main()
