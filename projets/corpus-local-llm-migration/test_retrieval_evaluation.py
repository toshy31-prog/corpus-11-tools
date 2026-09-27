import copy
import unittest

from retrieval_evaluation import SCHEMA, evaluate
from project_resume import response


class RetrievalEvaluationTests(unittest.TestCase):
    def manifest(self):
        return {"schema": SCHEMA, "quality_gates": {"min_mean_recall_at_k": .75, "min_case_hit_rate": .5, "max_forbidden_results": 0}, "cases": [
            {"id": "decisions", "expected_ids": ["decision.a", "decision.b"], "forbidden_ids": ["private.x"], "result_ids": ["decision.a", "other"]},
            {"id": "procedure", "expected_ids": ["runbook.a"], "result_ids": ["runbook.a"]},
        ]}

    def test_reports_coverage_rank_and_passes_gates(self):
        result = evaluate(self.manifest())
        self.assertEqual(result["result"], "pass")
        self.assertEqual(result["metrics"]["mean_recall_at_k"], .75)
        self.assertEqual(result["cases"][0]["missing_expected"], ["decision.b"])
        self.assertEqual(result["cases"][0]["first_relevant_rank"], 1)
        self.assertFalse(result["writes_performed"])

    def test_forbidden_result_fails_without_hiding_coverage(self):
        payload = self.manifest()
        payload["cases"][0]["result_ids"].append("private.x")
        result = evaluate(payload)
        self.assertEqual(result["result"], "fail")
        self.assertFalse(result["checks"]["forbidden_results"])
        self.assertEqual(result["metrics"]["forbidden_results"], 1)

    def test_portal_adapter_evaluates_manifest_without_running_retrieval(self):
        raw = response('POST', __import__('json').dumps({'action': 'retrieval_evaluate', 'manifest': self.manifest()}))
        self.assertIn(b'200 OK', raw)
        self.assertIn(b'"recorded_results_only"', raw)

    def test_rejects_ambiguous_or_unbounded_inputs(self):
        for mutate in (
            lambda p: p.update(schema="wrong"),
            lambda p: p["cases"][0].update(result_ids=["same", "same"]),
            lambda p: p["cases"][0].update(forbidden_ids=["decision.a"]),
            lambda p: p["quality_gates"].update(min_case_hit_rate=2),
        ):
            payload = copy.deepcopy(self.manifest())
            mutate(payload)
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    evaluate(payload)


if __name__ == "__main__":
    unittest.main()
