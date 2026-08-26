from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from kernel import build_snapshot, route  # noqa: E402
from neural_router import Example, NeuralRouter, vocabulary  # noqa: E402


ROOT = Path(__file__).resolve().parents[4]


class KernelTests(unittest.TestCase):
    def test_snapshot_is_deterministic_and_preserves_surfaces(self):
        first = build_snapshot(ROOT)
        second = build_snapshot(ROOT)
        self.assertEqual(first["fingerprint"], second["fingerprint"])
        surfaces = {material["surface"] for material in first["materials"]}
        self.assertTrue({"product", "research", "transfer", "workspace"}.issubset(surfaces))
        self.assertTrue(all(not any(part.startswith(".venv") for part in material["path"].split("/")) for material in first["materials"]))

    def test_router_selects_declared_capabilities_with_limits(self):
        result = route("Quelle est la cause et la provenance de cette source ?", ROOT)
        self.assertIn("causal-identification", result["recommended_capabilities"])
        self.assertIn("provenance-audit", result["recommended_capabilities"])
        self.assertEqual(result["execution"], "none")
        self.assertTrue(result["scope_limit"])
        self.assertTrue(result["reversal_condition"])

    def test_neural_network_learns_a_declared_routing_signal(self):
        examples = [
            Example("identifier une cause et un confondeur", ["causal-identification"], "fixture:causal"),
            Example("vérifier la provenance et les reprises d'une source", ["provenance-audit"], "fixture:provenance"),
        ]
        model = NeuralRouter(vocabulary(examples), ["causal-identification", "provenance-audit"], hidden=8)
        history = model.train(examples, epochs=80)
        self.assertLess(history[-1], history[0])
        self.assertEqual(model.predict("cause et confondeur", threshold=0.2)[0]["capability"], "causal-identification")


if __name__ == "__main__":
    unittest.main()
