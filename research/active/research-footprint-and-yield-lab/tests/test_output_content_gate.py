"""Bounded fictional protocol: identifiers are not output contents."""
from copy import deepcopy
import hashlib
import unittest

from test_generated_decision_logs import LOGS, metrics, matched_for_comparison, compare_costs


def signatures(log):
    result = {}
    for event in log["events"]:
        content = event.get("content")
        if not isinstance(content, str):
            return None
        digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
        name = event["output"]
        if name in result and result[name] != digest:
            return None
        result[name] = digest
    return result


def compare_contents(reference, candidate):
    left, right = metrics(reference), metrics(candidate)
    if not matched_for_comparison(left, right):
        return {"verdict": "unmatched", "delta": None}
    a, b = signatures(reference), signatures(candidate)
    if a is None or b is None:
        return {"verdict": "content_unknown", "delta": None}
    if a != b:
        return {"verdict": "unmatched_content", "delta": None}
    return compare_costs(left, right)


def fixture(name):
    log = deepcopy(LOGS[name])
    for event in log["events"]:
        event["content"] = {"shared-analysis": "Analyse fictive A.", "decision-a": "Retenir A."}[event["output"]]
    return log


class ContentGateTests(unittest.TestCase):
    def test_same_identifiers_hide_changed_content(self):
        reference = fixture("structured")
        for content in ["Analyse fictive B.", "Analyse fictive A. "]:
            candidate = deepcopy(reference)
            candidate["events"][0]["content"] = content
            self.assertTrue(matched_for_comparison(metrics(reference), metrics(candidate)))
            self.assertEqual(compare_contents(reference, candidate), {"verdict": "unmatched_content", "delta": None})

    def test_missing_or_conflicting_content_blocks_ranking(self):
        reference = fixture("baseline")
        for value in [None, 42]:
            candidate = deepcopy(reference)
            candidate["events"][0]["content"] = value
            self.assertEqual(compare_contents(reference, candidate), {"verdict": "content_unknown", "delta": None})
        candidate = deepcopy(reference)
        del candidate["events"][0]["content"]
        self.assertEqual(compare_contents(reference, candidate)["verdict"], "content_unknown")
        candidate = deepcopy(reference)
        candidate["events"][-1]["content"] = "Changer de décision."
        self.assertEqual(compare_contents(reference, candidate)["verdict"], "content_unknown")

    def test_identical_content_preserves_cost_vectors(self):
        reference, candidate = fixture("baseline"), fixture("structured")
        self.assertEqual(compare_contents(reference, deepcopy(reference))["verdict"], "equal_costs")
        self.assertEqual(compare_contents(reference, candidate)["verdict"], "candidate_dominates")
        delayed = deepcopy(candidate)
        delayed["events"][0].update(tokens=300, minutes=40)
        self.assertEqual(compare_contents(candidate, delayed), {"verdict": "tradeoff", "delta": {"tokens": -300, "minutes": 20, "calls": 0}})

    def test_different_question_is_still_unmatched(self):
        reference = fixture("structured")
        candidate = deepcopy(reference)
        candidate["question_id"] = "other"
        self.assertEqual(compare_contents(reference, candidate), {"verdict": "unmatched", "delta": None})


if __name__ == "__main__":
    unittest.main()
