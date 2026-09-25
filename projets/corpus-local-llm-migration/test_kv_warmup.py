"""KV warm-up is optional, bounded and never controls backend readiness."""
import unittest
from unittest.mock import patch

try:
    from kv_warmup import KvWarmup
except ImportError:
    KvWarmup = None


@unittest.skipIf(KvWarmup is None, "kv_warmup.py pas encore implémenté")
class KvWarmupContractTests(unittest.TestCase):

    def make(self, **kwargs):
        return KvWarmup(
            18744,
            "/workspace",
            timeout=10,
            poll_delay=0,
            deadline=30,
            **kwargs,
        )

    def test_create_prompt_busy_idle_delete(self):
        warm = self.make()

        replies = [
            {"id": "ses_test"},
            None,
            {},
            {"ses_test": {"type": "busy"}},
            {},
            True,
        ]

        with patch.object(warm, "_request", side_effect=replies) as request:
            self.assertTrue(warm._run())

        calls = request.call_args_list

        self.assertEqual(calls[0].args[:2], ("POST", "/session"))
        self.assertEqual(calls[0].args[2], {})

        self.assertEqual(
            calls[1].args[:2],
            ("POST", "/session/ses_test/prompt_async"),
        )

        payload = calls[1].args[2]
        self.assertEqual(payload["agent"], "corpus")
        self.assertEqual(payload["variant"], "direct")
        self.assertEqual(
            payload["model"],
            {
                "providerID": "corpus-local",
                "modelID": "qwen3.6-35b-a3b-ud-q4-k-m",
            },
        )

        texts = [
            p.get("text")
            for p in payload["parts"]
            if p.get("type") == "text"
        ]
        self.assertEqual(texts, ["TEST SILENCIEUX"])

        self.assertEqual(
            calls[-1].args[:2],
            ("DELETE", "/session/ses_test"),
        )

    def test_absence_before_busy_is_not_completion(self):
        warm = self.make()

        replies = [
            {"id": "ses_test"},
            None,
            {},
            {},
            {"ses_test": {"type": "busy"}},
            {},
            True,
        ]

        with patch.object(warm, "_request", side_effect=replies) as request:
            self.assertTrue(warm._run())

        status_calls = [
            c for c in request.call_args_list
            if c.args[:2] == ("GET", "/session/status")
        ]

        self.assertEqual(len(status_calls), 4)

    def test_failure_still_deletes_created_session(self):
        warm = self.make()

        with patch.object(
            warm,
            "_request",
            side_effect=[
                {"id": "ses_test"},
                OSError("prompt failed"),
                True,
            ],
        ) as request:
            self.assertFalse(warm._run())

        self.assertEqual(
            request.call_args_list[-1].args[:2],
            ("DELETE", "/session/ses_test"),
        )

    def test_start_runs_only_once(self):
        warm = self.make()

        with patch.object(warm, "_run", return_value=True) as run:
            warm.start()
            warm.start()
            warm.join(2)

        run.assert_called_once()

    def test_close_prevents_start(self):
        warm = self.make()
        warm.close()

        with patch.object(warm, "_run") as run:
            warm.start()

        run.assert_not_called()


class KvWarmupPresenceTest(unittest.TestCase):
    def test_component_exists(self):
        self.assertIsNotNone(
            KvWarmup,
            "kv_warmup.py n'existe pas encore",
        )


if __name__ == "__main__":
    unittest.main()
