import copy
import unittest

from performance_admission import SCHEMA, admit


class PerformanceAdmissionTests(unittest.TestCase):
    def manifest(self):
        return {
            "schema": SCHEMA,
            "experiment": "cache-reuse",
            "variation": {"key": "cache_reuse", "baseline": 0, "candidate": 128},
            "immutable_fields": ["engine", "model", "prompt_sha256", "tool_profile_sha256", "fixture_sha256"],
            "evidence": {
                "prefix_cache": {"counters": {"continuations_observed": 12, "prefix_candidates": 6, "content_stored": False}},
                "cache_latency": {"available": True, "groups": {"with_reported_cache_read": {"steps": 6}, "without_reported_cache_read": {"steps": 6}}},
            },
        }

    def test_admits_one_controlled_comparison_only_after_all_evidence(self):
        result = admit(self.manifest())
        self.assertEqual(result["decision"], "admit_one_grouped_ab_run")
        self.assertFalse(result["writes_performed"])
        self.assertEqual(result["comparison_contract"]["one_configuration_change"], "cache_reuse")

    def test_defers_when_live_prefix_observation_is_missing(self):
        value = self.manifest()
        value["evidence"]["prefix_cache"]["counters"]["prefix_candidates"] = 0
        result = admit(value)
        self.assertEqual(result["decision"], "defer_qwen_experiment")
        self.assertIn("candidats_de_prefixe_insuffisants", result["reasons"])

    def test_rejects_privacy_or_comparison_contract_gaps(self):
        for mutate in (
            lambda value: value["evidence"]["prefix_cache"]["counters"].update(content_stored=True),
            lambda value: value.update(immutable_fields=[]),
            lambda value: value["variation"].update(candidate=0),
            lambda value: value.update(extra=True),
        ):
            value = copy.deepcopy(self.manifest())
            mutate(value)
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    admit(value)


if __name__ == "__main__":
    unittest.main()
