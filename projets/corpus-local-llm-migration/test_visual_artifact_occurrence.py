import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import visual_artifact_occurrence as va


PNG = b"\x89PNG\r\n\x1a\n" + b"deterministic-visual-artifact-fixture"
TOKEN = "0123456789abcdef"


class VisualArtifactOccurrenceTests(unittest.TestCase):
    def test_two_identical_payloads_are_distinct_occurrences_and_new_process_resolves(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            producer = r"""
import json,sys
from pathlib import Path
import visual_artifact_occurrence as va
root=Path(sys.argv[1]); token=sys.argv[2]; payload=bytes.fromhex(sys.argv[3])
a=va.persist_visual_occurrence(root,payload,token,"screenshot")
b=va.persist_visual_occurrence(root,payload,token,"screenshot")
print(json.dumps({"a":a,"b":b}))
"""
            env = dict(os.environ)
            env["PYTHONPATH"] = str(Path(__file__).resolve().parent)
            made = subprocess.run(
                [sys.executable, "-c", producer, str(root), TOKEN, PNG.hex()],
                text=True, capture_output=True, check=True, env=env,
            )
            refs = json.loads(made.stdout)
            self.assertNotEqual(refs["a"], refs["b"])

            reader = r"""
import base64,json,sys
from pathlib import Path
import visual_artifact_occurrence as va
root=Path(sys.argv[1]); token=sys.argv[2]; ref=sys.argv[3]
listed=va.list_visual_occurrences(root,token)
resolved=va.resolve_visual_occurrence(root,ref)
r=resolved["receipt"]
print(json.dumps({
  "listed":listed,
  "token":r["producing_token"],
  "digest":r["content_sha256"],
  "available":resolved["payload_available"],
  "integrity":resolved["payload_integrity"],
  "payload_b64":base64.b64encode(resolved["payload"]).decode(),
}))
"""
            read = subprocess.run(
                [sys.executable, "-c", reader, str(root), TOKEN, refs["a"]],
                text=True, capture_output=True, check=True, env=env,
            )
            value = json.loads(read.stdout)
            self.assertEqual(set(value["listed"]), {refs["a"], refs["b"]})
            self.assertEqual(value["token"], TOKEN)
            self.assertEqual(value["digest"], hashlib.sha256(PNG).hexdigest())
            self.assertTrue(value["available"])
            self.assertEqual(value["integrity"], "verified")
            self.assertEqual(base64.b64decode(value["payload_b64"]), PNG)

            ra = va.resolve_visual_occurrence(root, refs["a"])["receipt"]
            rb = va.resolve_visual_occurrence(root, refs["b"])["receipt"]
            self.assertNotEqual(ra["occurrence_id"], rb["occurrence_id"])
            self.assertEqual(ra["content_sha256"], rb["content_sha256"])
            self.assertNotIn("verification_ref", json.dumps(ra))
            self.assertNotIn("verification_ref", json.dumps(rb))

    def test_publication_interruptions_only_receipt_final_is_canonical(self):
        stages = [
            ("after_payload_temp", False),
            ("after_payload_publish", False),
            ("after_receipt_temp", False),
            ("after_receipt_publish", True),
        ]
        for stage, published in stages:
            with self.subTest(stage=stage), tempfile.TemporaryDirectory() as raw:
                root = Path(raw)

                def stop(name):
                    if name == stage:
                        raise RuntimeError("injected:" + stage)

                with patch.object(va, "_checkpoint", stop):
                    with self.assertRaises(va.VisualArtifactPublicationError) as caught:
                        va.persist_visual_occurrence(root, PNG, TOKEN, "frame")
                self.assertEqual(caught.exception.published, published)
                ref = caught.exception.occurrence_ref
                self.assertIsNotNone(ref)
                listed = va.list_visual_occurrences(root, TOKEN)
                if published:
                    self.assertEqual(listed, [ref])
                    self.assertEqual(
                        va.resolve_visual_occurrence(root, ref)["payload_integrity"],
                        "verified",
                    )
                else:
                    self.assertEqual(listed, [])
                    with self.assertRaises(va.VisualArtifactError):
                        va.resolve_visual_occurrence(root, ref)

    def test_collision_never_overwrites_existing_occurrence(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            fixed = "a" * 32
            other = "b" * 32
            with patch.object(va, "_new_occurrence_id", side_effect=[fixed, other]):
                first = va.persist_visual_occurrence(root, PNG, TOKEN, "screenshot")
            first_receipt = va.resolve_visual_occurrence(root, first)
            first_bytes = first_receipt["payload"]

            with patch.object(va, "_new_occurrence_id", side_effect=[fixed, other]):
                second = va.persist_visual_occurrence(root, b"different", TOKEN, "screenshot")
            self.assertNotEqual(first, second)
            self.assertEqual(va.resolve_visual_occurrence(root, first)["payload"], first_bytes)
            self.assertEqual(va.resolve_visual_occurrence(root, second)["payload"], b"different")

    def test_missing_corrupt_and_incoherent_payload_or_receipt_are_distinct(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            ref = va.persist_visual_occurrence(root, PNG, TOKEN, "screenshot")
            receipt = va.resolve_visual_occurrence(root, ref)["receipt"]
            scope, oid = va._parse_ref(ref)
            occurrence_dir = root / scope / oid
            payload = occurrence_dir / "payload.png"

            payload.unlink()
            missing = va.resolve_visual_occurrence(root, ref)
            self.assertTrue(missing["receipt"])
            self.assertFalse(missing["payload_available"])
            self.assertEqual(missing["payload_integrity"], "unavailable")

            payload.write_bytes(b"corrupt")
            corrupt = va.resolve_visual_occurrence(root, ref)
            self.assertTrue(corrupt["payload_available"])
            self.assertEqual(corrupt["payload_integrity"], "mismatch")

            receipt_path = occurrence_dir / "receipt.json"
            bad = dict(receipt)
            bad["producing_token"] = "fedcba9876543210"
            receipt_path.write_text(json.dumps(bad))
            with self.assertRaisesRegex(va.VisualArtifactError, "producing_token incohérent"):
                va.resolve_visual_occurrence(root, ref)

    def test_addressing_validation_and_standalone(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            standalone = va.persist_visual_occurrence(root, PNG, None, "frame")
            resolved = va.resolve_visual_occurrence(root, standalone)
            self.assertIsNone(resolved["receipt"]["producing_token"])
            self.assertEqual(va.list_visual_occurrences(root, None), [standalone])

            bad_refs = [
                "visual-occurrence:../../escape:" + "a" * 32,
                "visual-occurrence:" + TOKEN + ":../escape",
                "visual-occurrence:" + TOKEN + ":" + "g" * 32,
                "/tmp/visual-occurrence:" + TOKEN + ":" + "a" * 32,
            ]
            for ref in bad_refs:
                with self.subTest(ref=ref):
                    with self.assertRaises(ValueError):
                        va.resolve_visual_occurrence(root, ref)

    def test_locator_cannot_escape_root(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            ref = va.persist_visual_occurrence(root, PNG, TOKEN, "screenshot")
            scope, oid = va._parse_ref(ref)
            receipt_path = root / scope / oid / "receipt.json"
            receipt = json.loads(receipt_path.read_text())
            receipt["storage_locator"] = "../escape.png"
            receipt_path.write_text(json.dumps(receipt))
            with self.assertRaisesRegex(va.VisualArtifactError, "storage_locator invalide"):
                va.resolve_visual_occurrence(root, ref)


if __name__ == "__main__":
    unittest.main()
