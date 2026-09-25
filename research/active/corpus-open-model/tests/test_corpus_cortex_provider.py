from __future__ import annotations

import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import corpus_cortex  # noqa: E402


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return json.dumps(self.payload).encode()


class CorpusCortexProviderTests(unittest.TestCase):
    def test_default_provider_is_canonical_loopback_openai_api(self):
        with patch.dict(os.environ, {}, clear=True):
            config = corpus_cortex.provider_config()
        self.assertEqual(config["base_url"], "http://127.0.0.1:18741/v1")
        self.assertEqual(config["model"], "corpus")
        self.assertEqual(
            config["chat_url"],
            "http://127.0.0.1:18741/v1/chat/completions",
        )

    def test_remote_provider_is_rejected_fail_closed(self):
        with patch.dict(
            os.environ,
            {"CORPUS_LLM_BASE_URL": "https://example.com/v1"},
            clear=False,
        ):
            with self.assertRaises(ValueError):
                corpus_cortex.provider_config()

    def test_chat_uses_openai_compatible_wire_contract(self):
        captured = {}

        def fake_urlopen(request, timeout):
            captured["url"] = request.full_url
            captured["timeout"] = timeout
            captured["payload"] = json.loads(request.data)
            return FakeResponse(
                {"choices": [{"message": {"content": "Réponse locale."}}]}
            )

        sources = [{
            "path": "README.md",
            "surface": "product",
            "status": "product_material_declared",
            "lexical_overlap": 2,
            "excerpt": "Corpus est local.",
        }]
        env = {
            "CORPUS_LLM_BASE_URL": "http://localhost:19001/v1",
            "CORPUS_LLM_MODEL": "corpus-test",
        }
        with patch.dict(os.environ, env, clear=False):
            with patch.object(corpus_cortex, "retrieve", return_value=sources):
                with patch.object(
                    corpus_cortex, "urlopen", side_effect=fake_urlopen
                ):
                    result = corpus_cortex.ask("Qu'est-ce que Corpus ?")

        self.assertEqual(
            captured["url"],
            "http://localhost:19001/v1/chat/completions",
        )
        self.assertEqual(captured["payload"]["model"], "corpus-test")
        self.assertFalse(
            captured["payload"]["chat_template_kwargs"]["enable_thinking"]
        )
        self.assertEqual(result["answer"], "Réponse locale.")
        self.assertEqual(result["runtime"], "corpus_local_openai_compatible")
        self.assertEqual(result["provider"]["network_scope"], "loopback_only")

    def test_current_console_surface_no_longer_requests_an_ollama_model(self):
        project = Path(__file__).resolve().parents[1]
        ui = (project / "ui/index.html").read_text()
        console = (project / "src/metabolism_console.py").read_text()
        cortex = (project / "src/corpus_cortex.py").read_text()

        self.assertNotIn("ollama-model", ui)
        self.assertNotIn('payload.get("model"', console)
        self.assertNotIn("11434", cortex)
        self.assertNotIn("api/chat", cortex)


if __name__ == "__main__":
    unittest.main()
