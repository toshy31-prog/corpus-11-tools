"""DR2: opt-in persistence at the decision owner, using only isolated fixtures."""
from copy import deepcopy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

import decision_grounding as dg
import decision_grounding_orchestrator as owner
import decision_receipt_store as store
import test_decision_grounding_orchestrator as legacy_fixtures

HERE = Path(__file__).resolve().parent


def deterministic_provider(query, limit):
    return {"results": [{"id": "doc", "source": "fixture", "text": "not evidence", "score": 0.9}]}


def owner_inputs(provider=None, **overrides):
    entity, assertion, graph = legacy_fixtures.T5aTests().fixture()
    value = dict(
        goal="safe change", context_graph=graph,
        projection_roots=[entity["entity_id"]],
        admission_policy=deepcopy(legacy_fixtures.POLICY),
        retrieval_query="q", retrieval_limit=5, retrieval_scope="A", retrieval_reason="ground",
        id_resolution_map={"doc": {"assertion_ref": assertion["assertion_id"]}},
        planner_base=deepcopy(legacy_fixtures.BASE), retrieval_search=provider or deterministic_provider,
        exposure_context=deepcopy(legacy_fixtures.EXPOSURE),
    )
    value.update(overrides)
    return value


PRODUCER = r'''
import json, os, socket
from copy import deepcopy
from unittest.mock import Mock, patch
import decision_grounding as dg
import decision_grounding_orchestrator as owner
from test_decision_grounding_persistence import owner_inputs, deterministic_provider
original_builder = dg.build_retrieval_grounded_receipt
captured = []
def capture(**kwargs):
    receipt = original_builder(**kwargs)
    captured.append(deepcopy(receipt))
    return receipt
provider = Mock(side_effect=deterministic_provider)
with patch.object(socket, "socket", side_effect=AssertionError("network forbidden")), \
     patch.object(dg, "build_retrieval_grounded_receipt", side_effect=capture):
    operational = owner.orchestrate(**owner_inputs(provider),
                                    receipt_store_root=os.environ["DR2_STORE_ROOT"])
assert operational["state"] == "planned"
assert operational["persistence"]["status"] == "stored"
assert len(captured) == 1 and provider.call_count == 1
print(json.dumps({"pid": os.getpid(), "operational": operational, "original": captured[0]}))
'''

READER = r'''
import json, os, socket, sys
from unittest.mock import patch
import decision_grounding as dg
from decision_receipt_store import resolve_decision_receipt
with patch.object(socket, "socket", side_effect=AssertionError("network forbidden")):
    receipt = resolve_decision_receipt(os.environ["DR2_STORE_ROOT"], sys.argv[1])
    digest = dg._digest({k: v for k, v in receipt.items() if k != "receipt_digest"})
print(json.dumps({"pid": os.getpid(), "receipt": receipt, "digest": digest,
                  "argument_count": len(sys.argv) - 1,
                  "orchestrator_loaded": "decision_grounding_orchestrator" in sys.modules}))
'''


class DecisionGroundingPersistenceDR2Tests(unittest.TestCase):
    def setUp(self):
        network = patch("socket.socket", side_effect=AssertionError("network forbidden"))
        network.start()
        self.addCleanup(network.stop)

    def run_child(self, code, env, *args):
        process = subprocess.run(
            [sys.executable, "-B", "-c", code, *args], cwd=HERE, env=env,
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=20, check=False,
        )
        self.assertEqual(process.returncode, 0, process.stderr)
        return json.loads(process.stdout)

    def test_default_and_none_do_not_import_or_call_storage(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw) / "must-not-be-created"
            # Merely knowing a root in the test environment is not an opt-in.
            with patch.dict(os.environ, {"DR2_STORE_ROOT": str(root)}), \
                 patch.dict(sys.modules, {"decision_receipt_store": None}), \
                 patch.object(Path, "mkdir", side_effect=AssertionError("storage creation forbidden")):
                implicit = owner.orchestrate(**owner_inputs())
                explicit_none = owner.orchestrate(**owner_inputs(), receipt_store_root=None)
            self.assertEqual(implicit, explicit_none)
            self.assertEqual(implicit["state"], "planned")
            self.assertNotIn("persistence", implicit)
            self.assertFalse(root.exists())
            self.assertEqual(list(Path(raw).iterdir()), [])

    def test_complete_receipt_is_passed_unchanged_and_identity_ignores_root(self):
        with tempfile.TemporaryDirectory() as raw:
            original_builder = dg.build_retrieval_grounded_receipt
            original_store = store.store_decision_receipt
            captured = []

            def capture(**kwargs):
                decision = original_builder(**kwargs)
                captured.append((decision, deepcopy(decision)))
                return decision

            def persist(root, decision):
                self.assertIs(decision, captured[-1][0])
                self.assertTrue(decision["consideration"]["retrieval_hits"])
                result = original_store(root, decision)
                self.assertEqual(decision, captured[-1][1])
                return result

            baseline = owner.orchestrate(**owner_inputs())
            with patch.object(dg, "build_retrieval_grounded_receipt", side_effect=capture), \
                 patch.object(store, "store_decision_receipt", side_effect=persist) as writer:
                results = [owner.orchestrate(**owner_inputs(), receipt_store_root=Path(raw) / name)
                           for name in ("one", "two")]
            self.assertEqual(writer.call_count, 2)
            self.assertEqual(captured[0][1], captured[1][1])
            for operational in results:
                self.assertEqual(operational["persistence"],
                                 {"decision_ref": baseline["decision_ref"], "status": "stored"})
                self.assertEqual({k: v for k, v in operational.items() if k != "persistence"}, baseline)
                self.assertNotIn("consideration", operational["decision_context_receipt"])
            self.assertNotIn(raw, dg._canon(captured[0][1]))
            self.assertNotIn("persistence", captured[0][1])

    def test_fresh_reader_resolves_only_ref_returned_by_real_orchestrator(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw) / "configured-store"
            home = Path(raw) / "home"
            home.mkdir()
            env = {"PATH": os.environ.get("PATH", os.defpath), "HOME": str(home),
                   "TMPDIR": raw, "LANG": "C.UTF-8", "PYTHONDONTWRITEBYTECODE": "1",
                   "PYTHONPYCACHEPREFIX": str(Path(raw) / "bytecode"), "DR2_STORE_ROOT": str(root)}
            produced = self.run_child(PRODUCER, env)
            operational = produced["operational"]
            decision_ref = operational["decision_ref"]
            # The producer has terminated. No original object or per-receipt path is sent.
            resolved = self.run_child(READER, env, decision_ref)
            self.assertNotEqual(produced["pid"], resolved["pid"])
            self.assertEqual(resolved["argument_count"], 1)
            self.assertFalse(resolved["orchestrator_loaded"])
            self.assertEqual(resolved["receipt"], produced["original"])
            self.assertTrue(resolved["receipt"]["consideration"]["retrieval_hits"])
            self.assertEqual(decision_ref, store.DECISION_REF_PREFIX + resolved["digest"])
            self.assertEqual(resolved["digest"], produced["original"]["receipt_digest"])
            print("DR2_PROCESS_PROOF=" + json.dumps({
                "decision_ref": decision_ref, "producer_pid": produced["pid"],
                "reader_pid": resolved["pid"], "producer_terminated_before_reader": True,
                "reader_input": "D + configured root", "exact_content": True,
                "consideration_present": True, "digest_verified": True,
            }, sort_keys=True), flush=True)

    def test_repeated_owner_call_preserves_identity_and_bytes(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw) / "store"
            provider = Mock(side_effect=deterministic_provider)
            first = owner.orchestrate(**owner_inputs(provider), receipt_store_root=root)
            files = list(root.glob("*.json"))
            self.assertEqual(len(files), 1)
            before = files[0].read_bytes()
            second = owner.orchestrate(**owner_inputs(provider), receipt_store_root=root)
            self.assertEqual(first["persistence"]["status"], "stored")
            self.assertEqual(second["persistence"],
                             {"decision_ref": first["decision_ref"], "status": "existing"})
            self.assertEqual(first["decision_ref"], second["decision_ref"])
            self.assertEqual(files[0].read_bytes(), before)
            self.assertEqual(list(root.iterdir()), files)
            self.assertEqual(provider.call_count, 2)  # Exactly one call per explicit request.

    def test_storage_error_is_explicit_without_grounding_retry_or_plan(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw) / "store"
            provider = Mock(side_effect=deterministic_provider)
            with patch.object(store, "store_decision_receipt", side_effect=PermissionError("injected")) as writer, \
                 patch.object(dg, "build_retrieval_grounded_receipt", wraps=dg.build_retrieval_grounded_receipt) as builder, \
                 patch.object(owner.planner, "plan") as planner:
                result = owner.orchestrate(**owner_inputs(provider), receipt_store_root=root)
            self.assertEqual(result["state"], "stopped_before_planner")
            self.assertEqual(result["stop_reason"], "decision_receipt_persistence_failed")
            self.assertEqual(result["persistence"], {
                "decision_ref": result["decision_ref"], "status": "error", "availability": "unknown",
                "error": {"kind": "PermissionError", "message": "injected"},
            })
            self.assertEqual(provider.call_count, 1)
            self.assertEqual(builder.call_count, 1)
            self.assertEqual(writer.call_count, 1)
            planner.assert_not_called()
            self.assertIsNone(result["execution_plan"])
            self.assertFalse(root.exists())

    def test_error_after_publication_does_not_claim_absence_or_remove_receipt(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw) / "store"
            provider = Mock(side_effect=deterministic_provider)
            original_store = store.store_decision_receipt
            published = []

            def publish_then_fail(configured_root, decision):
                original_store(configured_root, decision)
                path = next(root.glob("*.json"))
                published.append((path, path.read_bytes(), deepcopy(decision)))
                raise OSError("injected after publication")

            with patch.object(store, "store_decision_receipt", side_effect=publish_then_fail) as writer, \
                 patch.object(store, "resolve_decision_receipt", wraps=store.resolve_decision_receipt) as resolver, \
                 patch.object(owner.planner, "plan") as planner:
                result = owner.orchestrate(**owner_inputs(provider), receipt_store_root=root)
            self.assertEqual(result["state"], "stopped_before_planner")
            self.assertEqual(result["stop_reason"], "decision_receipt_persistence_failed")
            self.assertEqual(result["persistence"]["status"], "error")
            self.assertEqual(result["persistence"]["availability"], "unknown")
            self.assertEqual(result["persistence"]["error"]["kind"], "OSError")
            self.assertEqual(provider.call_count, 1)
            self.assertEqual(writer.call_count, 1)
            resolver.assert_not_called()  # No implicit post-error resolution/retry.
            planner.assert_not_called()
            path, before, original = published[0]
            self.assertEqual(path.read_bytes(), before)
            self.assertEqual(store.resolve_decision_receipt(root, result["decision_ref"]), original)

    def test_early_stops_without_decision_never_invoke_storage(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw) / "store"
            for rejected in (True, False):
                with self.subTest(exposure_rejected=rejected):
                    provider = Mock(return_value={"error": {"message": "fixture provider failure"}})
                    overrides = {"exposure_context": {}} if rejected else {}
                    with patch.object(store, "store_decision_receipt") as writer:
                        result = owner.orchestrate(**owner_inputs(provider, **overrides), receipt_store_root=root)
                    writer.assert_not_called()
                    self.assertEqual(provider.call_count, 0 if rejected else 1)
                    self.assertNotIn("decision_ref", result)
                    self.assertNotIn("persistence", result)
                    self.assertNotEqual(result["state"], "planned")
            self.assertFalse(root.exists())


if __name__ == "__main__":
    unittest.main()
