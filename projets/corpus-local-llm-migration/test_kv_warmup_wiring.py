"""Static contract for optional KV warm-up wiring."""
from pathlib import Path
import unittest


HERE = Path(__file__).resolve().parent
SOURCE = (HERE / "corpus_local.py").read_text()


class KvWarmupWiringTests(unittest.TestCase):
    def web_source(self):
        start = SOURCE.index("def web(")
        end = SOURCE.index("\ndef request(", start)
        return SOURCE[start:end]

    def test_backend_startup_remains_readiness_authority(self):
        web = self.web_source()
        self.assertIn(
            "readiness=startup.is_ready",
            web,
        )

    def test_warmup_is_separate_from_backend_startup(self):
        web = self.web_source()
        self.assertIn(
            "from kv_warmup import KvWarmup",
            web,
        )
        self.assertIn(
            "warmup = KvWarmup(web_port, ROOT)",
            web,
        )

    def test_warmup_starts_after_backend_startup(self):
        web = self.web_source()
        self.assertLess(
            web.index("startup.start()"),
            web.index("warmup.start()"),
        )

    def test_warmup_is_closed_before_backend_teardown(self):
        web = self.web_source()
        self.assertLess(
            web.index("warmup.close()"),
            web.index("startup.close()"),
        )


if __name__ == "__main__":
    unittest.main()
