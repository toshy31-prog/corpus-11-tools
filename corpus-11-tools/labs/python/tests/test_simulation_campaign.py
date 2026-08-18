from __future__ import annotations

import unittest

from corpus_labs.simulation_campaign import (
    apply_bounded_changes,
    compare_vectors,
    common_random,
    evaluate_loss_rules,
    pareto_dominates,
    pareto_frontier,
    possibility_relations,
    run_campaign,
    run_possibility_space,
    validate_budget,
)


class SimulationCampaignTests(unittest.TestCase):
    def test_common_random_is_coordinate_deterministic(self) -> None:
        self.assertEqual(common_random(7, "scene", 2).random(), common_random(7, "scene", 2).random())
        self.assertNotEqual(common_random(7, "scene", 2).random(), common_random(7, "scene", 3).random())

    def test_budget_accepts_matched_allocation(self) -> None:
        validate_budget({"observe": 0.4, "act": 0.6})

    def test_budget_rejects_mismatch_and_negative_values(self) -> None:
        with self.assertRaises(ValueError):
            validate_budget({"observe": 0.4, "act": 0.5})
        with self.assertRaises(ValueError):
            validate_budget({"observe": 1.1, "act": -0.1})

    def test_pareto_dominance_has_no_hidden_aggregate(self) -> None:
        orientations = {"loss": "min", "repair": "max"}
        self.assertTrue(pareto_dominates({"loss": 1, "repair": 3}, {"loss": 2, "repair": 3}, orientations))
        self.assertFalse(pareto_dominates({"loss": 1, "repair": 2}, {"loss": 2, "repair": 3}, orientations))

    def test_frontier_preserves_incomparable_survivors(self) -> None:
        frontier, dominated = pareto_frontier(
            {"a": {"x": 1, "y": 3}, "b": {"x": 2, "y": 2}, "c": {"x": 3, "y": 1}},
            {"x": "min", "y": "min"},
        )
        self.assertEqual(frontier, ["a", "b", "c"])
        self.assertEqual(dominated, {})

    def test_pair_relation_preserves_equivalence_and_incomparability(self) -> None:
        orientations = {"care": "max", "burden": "min"}
        self.assertEqual(compare_vectors({"care": 4, "burden": 2}, {"care": 4, "burden": 2}, orientations), "equivalent")
        self.assertEqual(compare_vectors({"care": 5, "burden": 3}, {"care": 4, "burden": 2}, orientations), "incomparable")
        relations = possibility_relations({"a": {"care": 5, "burden": 3}, "b": {"care": 4, "burden": 2}}, orientations)
        self.assertEqual(relations[0]["relation"], "incomparable")

    def test_equivalent_vectors_still_validate_dimensions_and_orientations(self) -> None:
        with self.assertRaises(ValueError):
            compare_vectors({"care": 4}, {"care": 4}, {"other": "max"})
        with self.assertRaises(ValueError):
            compare_vectors({"care": 4}, {"care": 4}, {"care": "sideways"})

    def test_neutral_surface_names_possibilities_and_boundaries(self) -> None:
        report = run_possibility_space(
            {"mutual": 2.0, "local": 1.0}, {"ordinary": 0.5},
            repetitions=2, seed="space", orientations={"care": "max"},
            run=lambda possibility, scenario, _rng, _context: {"care": possibility - scenario},
            boundary_rules={"minimum_care": {"metric": "care", "statistic": "median", "operator": "<", "threshold": 1.0}},
        )
        self.assertIn("possibility", report["runs"][0])
        self.assertNotIn("architecture", report["runs"][0])
        self.assertEqual(report["possibility_spaces"]["ordinary"]["nondominated"], ["mutual"])
        self.assertEqual(report["boundary_events"]["local"]["ordinary"], ["minimum_care"])

    def test_bounded_changes_copy_clamp_and_reject_unknowns(self) -> None:
        base = {"capacity": 0.9, "reserve": 0.2}
        self.assertEqual(apply_bounded_changes(base, {"capacity": 0.3}), {"capacity": 1.0, "reserve": 0.2})
        self.assertEqual(base["capacity"], 0.9)
        with self.assertRaises(ValueError):
            apply_bounded_changes(base, {"missing": 0.1})

    def test_campaign_matches_randomness_and_preserves_vector_results(self) -> None:
        contexts = []

        def simulate(capacity: float, demand: float, rng, context) -> dict[str, float]:
            contexts.append(context)
            disturbance = rng.random()
            return {
                "unserved": max(0.0, demand + disturbance - capacity),
                "reserve": max(0.0, capacity - demand - disturbance),
                "disturbance": disturbance,
            }

        report = run_campaign(
            {"small": 1.0, "large": 2.0},
            {"normal": 0.5, "surge": 1.5},
            repetitions=5,
            seed="network-7",
            orientations={"unserved": "min", "reserve": "max", "disturbance": "min"},
            run=simulate,
            loss_rules={
                "unserved_tail": {
                    "metric": "unserved",
                    "statistic": "p90",
                    "operator": ">",
                    "threshold": 0.5,
                }
            },
        )

        self.assertEqual(report["schema_version"], 1)
        self.assertEqual(len(report["runs"]), 20)
        self.assertEqual(report["frontiers"]["normal"]["members"], ["large"])
        self.assertEqual(report["losses"]["small"]["surge"], ["unserved_tail"])
        self.assertEqual(report["losses"]["large"]["normal"], [])
        self.assertEqual(contexts[0]["scenario_id"], "normal")
        self.assertEqual(contexts[0]["repetition"], 0)
        self.assertEqual(contexts[0]["architecture_id"], contexts[0]["possibility_id"])

        paired_runs = [
            item
            for item in report["runs"]
            if item["scenario"] == "normal" and item["repetition"] == 0
        ]
        self.assertEqual(
            paired_runs[0]["metrics"]["disturbance"],
            paired_runs[1]["metrics"]["disturbance"],
        )

    def test_campaign_rejects_metric_drift_and_invalid_rules(self) -> None:
        with self.assertRaises(ValueError):
            run_campaign(
                {"a": None},
                {"s": None},
                repetitions=1,
                seed=1,
                orientations={"loss": "min"},
                run=lambda _architecture, _scenario, _rng, _context: {"other": 1},
            )

        with self.assertRaises(ValueError):
            evaluate_loss_rules(
                {"loss": {"median": 1, "p90": 2}},
                {"bad": {"metric": "loss", "statistic": "mean", "operator": ">", "threshold": 1}},
            )

        with self.assertRaises(ValueError):
            run_campaign(
                {"a": None},
                {"s": None},
                repetitions=1,
                seed=1,
                orientations={"loss": "min"},
                run=lambda _a, _s, _rng, _context: {"loss": 1},
                quantiles={},
            )

    def test_campaign_supports_declared_linear_quantiles(self) -> None:
        report = run_campaign(
            {"a": None}, {"s": None}, repetitions=4, seed=1,
            orientations={"loss": "min"},
            run=lambda _a, _s, _rng, context: {"loss": context["repetition"]},
            quantiles={"p10": 0.1, "p90": 0.9}, quantile_method="linear",
        )
        summary = report["summaries"]["a"]["s"]["loss"]
        self.assertEqual(summary["median"], 1.5)
        self.assertAlmostEqual(summary["p10"], 0.3)
        self.assertAlmostEqual(summary["p90"], 2.7)

    def test_nearest_rank_rejects_zero_but_linear_can_report_a_minimum(self) -> None:
        arguments = {
            "architectures": {"a": None},
            "scenarios": {"s": None},
            "repetitions": 2,
            "seed": 1,
            "orientations": {"loss": "min"},
            "run": lambda _a, _s, _rng, context: {"loss": context["repetition"]},
            "quantiles": {"p0": 0.0},
        }
        with self.assertRaises(ValueError):
            run_campaign(**arguments)
        report = run_campaign(**arguments, quantile_method="linear")
        self.assertEqual(report["summaries"]["a"]["s"]["loss"]["p0"], 0.0)


if __name__ == "__main__":
    unittest.main()
