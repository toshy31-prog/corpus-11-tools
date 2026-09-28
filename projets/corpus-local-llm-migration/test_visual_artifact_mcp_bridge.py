import base64
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import corpus_gpt_mcp as m
import visual_artifact_occurrence as va


PNG = b"\x89PNG\r\n\x1a\nmcp-bridge-fixture"
IMAGE = "data:image/png;base64," + base64.b64encode(PNG).decode()
TOKEN_A = "0123456789abcdef"
TOKEN_B = "fedcba9876543210"
TARGET_A = "http://127.0.0.1:8080/ui#a"
TARGET_B = "http://127.0.0.1:8080/ui#b"


class FakePeer:
    def __init__(self, response):
        self.payload = (json.dumps(response) + "\n").encode()
        self.sent = b""

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def settimeout(self, _value):
        pass

    def connect(self, _path):
        pass

    def sendall(self, value):
        self.sent += value

    def recv(self, _size):
        if not self.payload:
            return b""
        value, self.payload = self.payload, b""
        return value


def browser_value():
    return {
        "url": TARGET_A,
        "title": "fixture",
        "running": True,
        "visible": False,
        "text": "fixture",
        "image": IMAGE,
    }


def serialized(result):
    return json.loads(result["content"][0]["text"])


class VisualArtifactMcpBridgeTests(unittest.TestCase):
    def sockets(self, *responses):
        peers = [FakePeer(value) for value in responses]
        return patch.object(m.socket, "socket", side_effect=peers)

    def test_capture_uses_lifecycle_snapshot_and_returns_resolvable_ref_with_exact_bytes(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            lifecycle_a = {"token": TOKEN_A, "target": TARGET_A}
            lifecycle_b = {"token": TOKEN_B, "target": TARGET_B}
            sync = {"result": {"url": TARGET_A, "title": "fixture", "running": True}}
            shot = {"result": browser_value()}
            with patch.object(m, "VISUAL_ARTIFACT_ROOT", root), \
                 patch.object(m, "active_visual_target", side_effect=[lifecycle_a, lifecycle_b]) as active, \
                 self.sockets(sync, shot):
                result = m.browser_call({"action": "screenshot"})

            self.assertFalse(result["isError"])
            self.assertEqual(active.call_count, 1)
            body = serialized(result)
            self.assertEqual(body["lifecycle_token"], TOKEN_A)
            self.assertEqual(body["visual_occurrence_attribution"], "lifecycle")
            self.assertEqual(body["visual_occurrence_status"], "published")
            ref = body["visual_occurrence_ref"]
            resolved = va.resolve_visual_occurrence(root, ref)
            self.assertEqual(resolved["receipt"]["producing_token"], TOKEN_A)
            self.assertEqual(resolved["payload"], PNG)
            self.assertEqual(result["content"][1]["data"], base64.b64encode(PNG).decode())

    def test_established_absence_of_lifecycle_persists_standalone(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            with patch.object(m, "VISUAL_ARTIFACT_ROOT", root), \
                 patch.object(m, "active_visual_target", return_value=None), \
                 self.sockets({"result": browser_value()}):
                result = m.browser_call({"action": "frame"})

            self.assertFalse(result["isError"])
            body = serialized(result)
            self.assertEqual(body["visual_occurrence_attribution"], "standalone")
            ref = body["visual_occurrence_ref"]
            self.assertTrue(ref.startswith("visual-occurrence:standalone:"))
            resolved = va.resolve_visual_occurrence(root, ref)
            self.assertIsNone(resolved["receipt"]["producing_token"])
            self.assertEqual(resolved["payload"], PNG)

    def test_lifecycle_read_error_is_uncertain_and_never_falls_back_to_standalone(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            with patch.object(m, "VISUAL_ARTIFACT_ROOT", root), \
                 patch.object(m, "active_visual_target", side_effect=RuntimeError("state unreadable")), \
                 patch.object(m.visual_artifacts, "persist_visual_occurrence") as persist, \
                 self.sockets({"result": browser_value()}):
                result = m.browser_call({"action": "screenshot"})

            self.assertTrue(result["isError"])
            body = serialized(result)
            self.assertEqual(body["visual_occurrence_status"], "attribution_uncertain")
            self.assertIn("state unreadable", body["visual_occurrence_error"])
            self.assertNotIn("visual_occurrence_ref", body)
            persist.assert_not_called()
            self.assertEqual(result["content"][1]["data"], base64.b64encode(PNG).decode())

    def test_publication_error_before_receipt_is_visible_without_published_ref(self):
        error = va.VisualArtifactPublicationError(
            "before receipt", occurrence_ref="visual-occurrence:%s:%s" % (TOKEN_A, "a" * 32),
            published=False,
        )
        lifecycle = {"token": TOKEN_A, "target": TARGET_A}
        sync = {"result": {"url": TARGET_A, "title": "fixture", "running": True}}
        with patch.object(m, "active_visual_target", return_value=lifecycle), \
             patch.object(m.visual_artifacts, "persist_visual_occurrence", side_effect=error) as persist, \
             self.sockets(sync, {"result": browser_value()}):
            result = m.browser_call({"action": "screenshot"})

        self.assertTrue(result["isError"])
        body = serialized(result)
        self.assertEqual(body["visual_occurrence_status"], "publication_error")
        self.assertFalse(body["visual_occurrence_published"])
        self.assertNotIn("visual_occurrence_ref", body)
        self.assertEqual(persist.call_count, 1)
        self.assertEqual(result["content"][1]["data"], base64.b64encode(PNG).decode())

    def test_published_error_preserves_ref_and_never_retries_persistence(self):
        ref = "visual-occurrence:%s:%s" % (TOKEN_A, "b" * 32)
        error = va.VisualArtifactPublicationError(
            "receipt published but sync failed", occurrence_ref=ref, published=True,
        )
        lifecycle = {"token": TOKEN_A, "target": TARGET_A}
        sync = {"result": {"url": TARGET_A, "title": "fixture", "running": True}}
        with patch.object(m, "active_visual_target", return_value=lifecycle), \
             patch.object(m.visual_artifacts, "persist_visual_occurrence", side_effect=error) as persist, \
             self.sockets(sync, {"result": browser_value()}):
            result = m.browser_call({"action": "frame"})

        self.assertTrue(result["isError"])
        body = serialized(result)
        self.assertEqual(body["visual_occurrence_status"], "publication_error")
        self.assertTrue(body["visual_occurrence_published"])
        self.assertEqual(body["visual_occurrence_ref"], ref)
        self.assertEqual(persist.call_count, 1)
        self.assertEqual(result["content"][1]["data"], base64.b64encode(PNG).decode())


if __name__ == "__main__":
    unittest.main()
