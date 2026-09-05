#!/usr/bin/env python3
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "research/fixtures/product_query_evaluation_v0.1.json"
PROTOCOL = ROOT / "research/PRODUCT_QUERY_EVALUATION_PROTOCOL_v0.1.md"
COMPILER_PATH = ROOT / "research/scripts/compile_product_query_evaluation_b.py"
SPEC = importlib.util.spec_from_file_location("compile_b", COMPILER_PATH)
compiler = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(compiler)
SURFACE_PATH = ROOT / "research/active/model-response-comparison-harness/native_surface/tools/conversation_surface.py"
SURFACE_SPEC = importlib.util.spec_from_file_location("conversation_surface", SURFACE_PATH)
surface = importlib.util.module_from_spec(SURFACE_SPEC)
assert SURFACE_SPEC.loader is not None
SURFACE_SPEC.loader.exec_module(surface)


class CompileProductQueryEvaluationBTests(unittest.TestCase):
    def test_compiles_and_seals_autonomous_b_packets_without_renders(self):
        with tempfile.TemporaryDirectory() as temporary:
            output_dir = Path(temporary) / "packets"
            manifest = compiler.compile_templates(PROTOCOL, FIXTURE, output_dir)
            self.assertEqual(manifest["packet_count"], 18)
            self.assertTrue((output_dir / "manifest.json").is_file())
            self.assertEqual(manifest["protocol_sha256"], compiler.sha256_file(PROTOCOL))
            self.assertEqual(manifest["fixture_sha256"], compiler.sha256_file(FIXTURE))
            self.assertEqual(manifest["compiler_sha256"], compiler.sha256_file(COMPILER_PATH))
            for item in manifest["packets"]:
                packet = json.loads((output_dir / item["filename"]).read_text(encoding="utf-8"))
                compiler.validate_packet(packet)
                surface.validate_packet(packet)
                self.assertEqual(packet["packet_sha256"], item["sha256"])
                self.assertEqual(hashlib.sha256(compiler.canonical({k: v for k, v in packet.items() if k != "packet_sha256"}).encode("utf-8")).hexdigest(), item["sha256"])
                self.assertTrue(packet["raw_prompt"].startswith("Référence de paquet B / "))
            all_json = list(output_dir.rglob("*.json"))
            self.assertEqual(len(all_json), 19)
            self.assertFalse(any("render" in path.name for path in all_json))
            self.assertFalse(any(json.loads(path.read_text(encoding="utf-8")).get("schema") == "corpus-conversation-render/v1" for path in all_json))

    def test_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as temporary:
            output_dir = Path(temporary) / "packets"
            compiler.compile_templates(PROTOCOL, FIXTURE, output_dir)
            with self.assertRaises(FileExistsError):
                compiler.compile_templates(PROTOCOL, FIXTURE, output_dir)


if __name__ == "__main__":
    unittest.main(verbosity=2)
