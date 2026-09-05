#!/usr/bin/env python3
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PROTOCOL = ROOT / "research/PRODUCT_QUERY_EVALUATION_PROTOCOL_v0.1.md"
FIXTURE = ROOT / "research/fixtures/product_query_evaluation_v0.1.json"

def load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module

compiler = load("compile_b", ROOT / "research/scripts/compile_product_query_evaluation_b.py")
renderer = load("render_b", ROOT / "research/scripts/render_product_query_evaluation_b.py")


class RenderProductQueryEvaluationBTests(unittest.TestCase):
    def test_renders_fifty_four_valid_outputs_in_a_temporary_directory(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "sealed"
            output = root / "renders"
            source_manifest = compiler.compile_templates(PROTOCOL, FIXTURE, source)
            render_manifest = renderer.render_packets(source, output)
            self.assertEqual(render_manifest["render_count"], 54)
            self.assertEqual(len(render_manifest["renders"]), 54)
            self.assertEqual(render_manifest["source_manifest_declared_sha256"], source_manifest["manifest_sha256"])
            self.assertEqual(render_manifest["source_manifest_file_sha256"], renderer.sha256_file(source / "manifest.json"))
            self.assertEqual(len(list(output.glob("*.json"))), 55)
            for item in render_manifest["renders"]:
                packet = json.loads((source / f"{item['packet_id']}.json").read_text(encoding="utf-8"))
                rendered = json.loads((output / item["filename"]).read_text(encoding="utf-8"))
                renderer.surface.verify(packet, rendered)
                self.assertEqual(rendered["render_sha256"], item["sha256"])

    def test_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "sealed"
            output = root / "renders"
            compiler.compile_templates(PROTOCOL, FIXTURE, source)
            renderer.render_packets(source, output)
            with self.assertRaises(FileExistsError):
                renderer.render_packets(source, output)


if __name__ == "__main__":
    unittest.main(verbosity=2)
