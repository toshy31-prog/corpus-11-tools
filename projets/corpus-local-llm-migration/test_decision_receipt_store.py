import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import textwrap
import unittest

import decision_grounding as dg
import decision_receipt_store as store


HERE = Path(__file__).resolve().parent

PRODUCER = r"""
import json
import os
import context_algebra as ca
import decision_grounding as dg
from decision_receipt_store import store_decision_receipt

policy={"schema":"decision_admission_policy.v1","version":"dr1","rules":[
 {"rule_id":"rev","predicate":"task.reversibility","goal_terms":["safe","change"],"allowed_planner_axes":["reversibility"]}
]}
bounds={"source":"dr1-fixture","limit":5,"scope":"project:dr1","reason":"local identity proof"}
entity=ca.entity("scope",{"scheme":"canonical-uri","value":"dr1:test"})
evidence=ca.evidence("fact",digest="dr1-evidence",evidence_id="ev:dr1")
assertion=ca.assertion(entity["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:dr1"])
graph=ca.graph(entities=[entity],assertions=[assertion],evidence_items=[evidence])
hit={"retrieval_ref":"dr1-hit","source":{"provider":"fixture"},"score":0.7,"rank":1,
     "resolution":{"assertion_ref":assertion["assertion_id"]}}
receipt=dg.build_retrieval_grounded_receipt(
    goal="safe change",
    context_graph=graph,
    projection_roots=[entity["entity_id"]],
    policy=policy,
    retrieval_results=[hit],
    retrieval_bounds=bounds,
)
saved=store_decision_receipt(os.environ["DR1_STORE_ROOT"], receipt)
print(json.dumps({"decision_ref":saved["decision_ref"],"status":saved["status"],"receipt":receipt},
                 ensure_ascii=False,sort_keys=True,separators=(",",":")))
"""

READER = r"""
import json
import os
import sys
import decision_grounding as dg
from decision_receipt_store import resolve_decision_receipt, recompute_receipt_digest
receipt=resolve_decision_receipt(os.environ["DR1_STORE_ROOT"], sys.argv[1])
print(json.dumps({"receipt":receipt,"digest":recompute_receipt_digest(receipt)},
                 ensure_ascii=False,sort_keys=True,separators=(",",":")))
"""


class DecisionReceiptStoreDR1Tests(unittest.TestCase):
    def run_python(self, code, *, env, args=()):
        proc = subprocess.run(
            [sys.executable, "-c", code, *args],
            cwd=HERE,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        return proc.stdout.strip()

    def produce(self, root):
        env = os.environ.copy()
        env["DR1_STORE_ROOT"] = str(root)
        raw = self.run_python(PRODUCER, env=env)
        value = json.loads(raw)
        self.assertEqual(value["status"], "stored")
        self.assertTrue(value["receipt"]["consideration"]["retrieval_hits"])
        return env, value

    def test_fresh_process_roundtrip_exact_receipt_and_digest(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw) / "decision-receipts"
            env, produced = self.produce(root)
            decision_ref = produced["decision_ref"]
            original = produced["receipt"]

            # Producer is gone. Reader receives only normal root configuration + D.
            reader_raw = self.run_python(READER, env=env, args=(decision_ref,))
            resolved = json.loads(reader_raw)

            self.assertEqual(resolved["receipt"], original)
            self.assertEqual(
                decision_ref,
                store.DECISION_REF_PREFIX + resolved["digest"],
            )
            self.assertEqual(resolved["digest"], original["receipt_digest"])

            identified_body = {k: v for k, v in original.items() if k != "receipt_digest"}
            self.assertIn("consideration", identified_body)
            self.assertNotIn("receipt_digest", identified_body)
            self.assertEqual(dg._digest(identified_body), original["receipt_digest"])

            changed = json.loads(json.dumps(original))
            changed["consideration"]["retrieval_hits"][0]["rank"] = 99
            self.assertNotEqual(
                store.recompute_receipt_digest(changed),
                original["receipt_digest"],
            )

    def test_same_receipt_is_idempotent_and_bytes_are_preserved(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw) / "decision-receipts"
            _, produced = self.produce(root)
            receipt = produced["receipt"]
            ref = produced["decision_ref"]
            path = root / (ref.split(":", 1)[1] + ".json")
            before = path.read_bytes()

            one = store.store_decision_receipt(root, receipt)
            two = store.store_decision_receipt(root, receipt)

            self.assertEqual(one, {"decision_ref": ref, "status": "existing"})
            self.assertEqual(two, {"decision_ref": ref, "status": "existing"})
            self.assertEqual(path.read_bytes(), before)

    def test_tampered_consideration_is_detected(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw) / "decision-receipts"
            _, produced = self.produce(root)
            receipt = produced["receipt"]
            ref = produced["decision_ref"]
            path = root / (ref.split(":", 1)[1] + ".json")

            tampered = json.loads(json.dumps(receipt))
            tampered["consideration"]["retrieval_hits"][0]["source"] = {"provider":"tampered"}
            path.write_text(dg._canon(tampered) + "\n", encoding="utf-8")

            with self.assertRaises(store.DecisionReceiptIntegrityError):
                store.resolve_decision_receipt(root, ref)

    def test_absent_and_unreadable_are_explicit(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw) / "decision-receipts"
            root.mkdir()
            missing_ref = store.DECISION_REF_PREFIX + ("a" * 64)
            with self.assertRaises(store.DecisionReceiptNotFound):
                store.resolve_decision_receipt(root, missing_ref)

            broken_ref = store.DECISION_REF_PREFIX + ("b" * 64)
            (root / (("b" * 64) + ".json")).write_text("{not-json", encoding="utf-8")
            with self.assertRaises(store.DecisionReceiptIntegrityError):
                store.resolve_decision_receipt(root, broken_ref)

    def test_existing_incoherent_object_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw) / "decision-receipts"
            _, produced = self.produce(root)
            receipt = produced["receipt"]
            ref = produced["decision_ref"]
            path = root / (ref.split(":", 1)[1] + ".json")
            path.write_text("{broken", encoding="utf-8")
            before = path.read_bytes()

            with self.assertRaises(store.DecisionReceiptConflict):
                store.store_decision_receipt(root, receipt)
            self.assertEqual(path.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
