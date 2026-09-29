import json
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

import durable_e2e
import local_task_bridge as bridge


class FakeOpenCode:
    def __init__(self, *, fail_submit=False, create_delay=0.0):
        self.fail_submit = fail_submit
        self.create_delay = create_delay
        self.calls = []
        self.messages = []
        self._lock = threading.Lock()

    def __call__(self, method, path, body, directory):
        with self._lock:
            self.calls.append((method, path, body, directory))
        if method == "POST" and path == "/session":
            if self.create_delay:
                time.sleep(self.create_delay)
            return {"id": "ses_recovery"}
        if path.endswith("/prompt_async"):
            if self.fail_submit:
                raise OSError("connexion coupée après envoi possible")
            return {}
        if path == "/permission":
            return []
        if path.endswith("/message"):
            return list(self.messages)
        if method == "POST" and path.endswith("/abort"):
            return {}
        if method == "GET" and path == "/session/ses_recovery":
            return {"id": "ses_recovery"}
        return {}


class LocalTaskRecoveryTests(unittest.TestCase):
    def payload(self, objective="audit", tool_scope=None):
        return bridge._message(
            objective, None, ["lecture seule"], agent="corpus", tool_scope=tool_scope
        )

    def spec(self, payload):
        return {"directory": "/Corpus", "message": payload}

    def test_A_session_id_is_persisted_before_prompt_async(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "receipt.json"
            payload = self.payload()
            seen = {}

            def request(method, url, body, directory):
                if url == "/session":
                    return {"id": "ses_recovery"}
                if url.endswith("/prompt_async"):
                    persisted = json.loads(path.read_text())
                    seen.update(persisted)
                    return {}
                return {}

            result, created = durable_e2e.start_or_resume(
                request, payload, path, spec=self.spec(payload),
                title="test", directory="/Corpus", deadline=30,
            )
            self.assertTrue(created)
            self.assertEqual(seen["state"], "submitting")
            self.assertEqual(seen["session_id"], "ses_recovery")
            self.assertEqual(result["state"], "submitted")

    def test_B_active_resume_never_resubmits(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "receipt.json"
            fake = FakeOpenCode()
            payload = self.payload()
            first, created_first = durable_e2e.start_or_resume(
                fake, payload, path, spec=self.spec(payload),
                title="test", directory="/Corpus", deadline=30,
            )
            second, created_second = durable_e2e.start_or_resume(
                fake, payload, path, spec=self.spec(payload),
                title="test", directory="/Corpus", deadline=30,
            )
            self.assertTrue(created_first)
            self.assertFalse(created_second)
            self.assertEqual(first["session_id"], second["session_id"])
            self.assertEqual(
                sum(url.endswith("/prompt_async") for _, url, _, _ in fake.calls), 1
            )

    def test_C_completed_resume_reads_existing_result_without_resubmit(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fake = FakeOpenCode()
            payload = self.payload()
            path = durable_e2e.recovery_path("completed-case", root=root)
            durable_e2e.start_or_resume(
                fake, payload, path, spec=self.spec(payload),
                title="Tâche locale bornée", directory="/Corpus", deadline=30,
            )
            fake.messages = [
                {"info": {"id": "user1", "role": "user"}},
                {
                    "info": {
                        "role": "assistant",
                        "parentID": "user1",
                        "finish": "stop",
                        "time": {"completed": 1},
                    },
                    "parts": [{"type": "text", "text": "résultat existant"}],
                },
            ]
            with patch.object(durable_e2e, "RECOVERY_ROOT", root):
                result = bridge.submit_local_task(
                    objective="audit",
                    directory="/Corpus",
                    constraints=["lecture seule"],
                    recovery_ref="completed-case",
                    request=fake,
                )
            self.assertEqual(result["status"], "completed")
            self.assertEqual(result["summary"], "résultat existant")
            self.assertFalse(result["session_created"])
            self.assertEqual(
                sum(url.endswith("/prompt_async") for _, url, _, _ in fake.calls), 1
            )

    def test_D_malformed_or_incomplete_state_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "receipt.json"
            path.write_text(json.dumps({"schema_version": 1, "state": "submitted"}))
            payload = self.payload()
            with self.assertRaises(ValueError):
                durable_e2e.start_or_resume(
                    FakeOpenCode(), payload, path, spec=self.spec(payload),
                    title="test", directory="/Corpus", deadline=30,
                )
            for bad in ("../escape", "/absolute", "x y", ""):
                with self.assertRaises(ValueError):
                    durable_e2e.recovery_path(bad, root=tmp)

    def test_E_same_handle_with_incompatible_spec_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "receipt.json"
            fake = FakeOpenCode()
            payload = self.payload("audit")
            durable_e2e.start_or_resume(
                fake, payload, path, spec=self.spec(payload),
                title="test", directory="/Corpus", deadline=30,
            )
            other = self.payload("autre objectif")
            with self.assertRaisesRegex(ValueError, "incompatible"):
                durable_e2e.start_or_resume(
                    fake, other, path, spec=self.spec(other),
                    title="test", directory="/Corpus", deadline=30,
                )
            self.assertEqual(
                sum(url.endswith("/prompt_async") for _, url, _, _ in fake.calls), 1
            )

    def test_E2_required_tools_are_bound_into_recovery_spec(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "receipt.json"
            fake = FakeOpenCode()
            payload = self.payload("audit")
            first_spec = {**self.spec(payload), "required_tools": ["read"]}
            durable_e2e.start_or_resume(
                fake, payload, path, spec=first_spec,
                title="test", directory="/Corpus", deadline=30,
            )
            second_spec = {**self.spec(payload), "required_tools": ["glob"]}
            with self.assertRaisesRegex(ValueError, "incompatible"):
                durable_e2e.start_or_resume(
                    fake, payload, path, spec=second_spec,
                    title="test", directory="/Corpus", deadline=30,
                )
            self.assertEqual(
                sum(url.endswith("/prompt_async") for _, url, _, _ in fake.calls), 1
            )

    def test_F_concurrent_creation_same_handle_is_at_most_once(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "receipt.json"
            fake = FakeOpenCode(create_delay=0.05)
            payload = self.payload()

            def invoke():
                return durable_e2e.start_or_resume(
                    fake, payload, path, spec=self.spec(payload),
                    title="test", directory="/Corpus", deadline=30,
                )

            with ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(lambda _: invoke(), range(2)))
            self.assertEqual(sorted(created for _, created in results), [False, True])
            self.assertEqual(sum(url == "/session" for _, url, _, _ in fake.calls), 1)
            self.assertEqual(
                sum(url.endswith("/prompt_async") for _, url, _, _ in fake.calls), 1
            )

    def test_G_submit_uncertain_never_becomes_resend_permission(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "receipt.json"
            fake = FakeOpenCode(fail_submit=True)
            payload = self.payload()
            first, _ = durable_e2e.start_or_resume(
                fake, payload, path, spec=self.spec(payload),
                title="test", directory="/Corpus", deadline=30,
            )
            self.assertEqual(first["state"], "submit_uncertain")
            second, created = durable_e2e.start_or_resume(
                fake, payload, path, spec=self.spec(payload),
                title="test", directory="/Corpus", deadline=30,
            )
            self.assertFalse(created)
            self.assertEqual(second["state"], "submit_uncertain")
            self.assertEqual(
                sum(url.endswith("/prompt_async") for _, url, _, _ in fake.calls), 1
            )

    def test_H_deadline_is_terminal_and_does_not_restart(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fake = FakeOpenCode()
            with patch.object(durable_e2e, "RECOVERY_ROOT", root):
                first = bridge.submit_local_task(
                    objective="audit",
                    directory="/Corpus",
                    constraints=["lecture seule"],
                    recovery_ref="deadline-case",
                    deadline=0.03,
                    poll_delay=0.001,
                    request=fake,
                    sleep=time.sleep,
                )
                second = bridge.submit_local_task(
                    objective="audit",
                    directory="/Corpus",
                    constraints=["lecture seule"],
                    recovery_ref="deadline-case",
                    deadline=0.03,
                    poll_delay=0.001,
                    request=fake,
                    sleep=time.sleep,
                )
                receipt = json.loads(
                    durable_e2e.recovery_path("deadline-case", root=root).read_text()
                )
            self.assertEqual(first["error"], "task_timeout")
            self.assertEqual(second["error"], "task_timeout")
            self.assertEqual(receipt["state"], "deadline")
            self.assertEqual(sum(url == "/session" for _, url, _, _ in fake.calls), 1)
            self.assertEqual(
                sum(url.endswith("/prompt_async") for _, url, _, _ in fake.calls), 1
            )
            self.assertEqual(
                sum(url.endswith("/abort") for _, url, _, _ in fake.calls), 1
            )


if __name__ == "__main__":
    unittest.main()
