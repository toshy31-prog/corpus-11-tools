import tempfile, unittest
from pathlib import Path
from unittest.mock import patch
import capability_handoff as h
class HandoffTests(unittest.TestCase):
    def test_resume_detects_divergence(self):
        with tempfile.TemporaryDirectory() as raw:
            with patch.object(h,"HANDOFFS",Path(raw)), patch.object(h,"git_snapshot",return_value={"head":"a","status":" M x"}):
                r=h.create(start_head="a"); self.assertTrue(h.resume(r["handoff_id"])["compatible"])
                with patch.object(h,"git_snapshot",return_value={"head":"b","status":" M x"}):
                    self.assertFalse(h.resume(r["handoff_id"])["compatible"])
    def test_client_boundary_flags_are_explicit(self):
        with tempfile.TemporaryDirectory() as raw:
            with patch.object(h,"HANDOFFS",Path(raw)), patch.object(h,"git_snapshot",return_value={"head":"a","status":""}), patch.object(h.reload_guard,"read_state",return_value={"loaded_digest":"old"}), patch.object(h.reload_guard,"source_digest",return_value="new"):
                r=h.create(expected_capabilities=["old","new"],observed_capabilities=["old"])
                self.assertFalse(r["runtime_reload_complete"])
                self.assertTrue(r["reload_required"])
                self.assertTrue(r["plugin_refresh_required"])
                self.assertTrue(r["new_chat_required"])
                self.assertEqual(r["new_chat_reason"], "tool_surface_schema_changed")
                self.assertFalse(r["same_chat_continuation_allowed"])

    def test_checkpoint_continues_same_chat_when_surface_is_stable(self):
        with tempfile.TemporaryDirectory() as raw:
            with patch.object(h,"HANDOFFS",Path(raw)), patch.object(h,"git_snapshot",return_value={"head":"a","status":""}), patch.object(h.reload_guard,"read_state",return_value={"loaded_digest":"same"}), patch.object(h.reload_guard,"source_digest",return_value="same"):
                r=h.create(expected_capabilities=["status"],observed_capabilities=["status"],exact_jobs={"validate":"job-a"},async_tokens=[{"job":"job-a","token":"0123456789abcdef","status":"running"}],baselines=["UX PASS"],stop_conditions=["job-a exit 0"])
                self.assertFalse(r["reload_required"])
                self.assertFalse(r["plugin_refresh_required"])
                self.assertFalse(r["new_chat_required"])
                self.assertTrue(r["same_chat_continuation_allowed"])
                self.assertEqual(r["exact_jobs"]["validate"],"job-a")
                self.assertEqual(r["async_tokens"][0]["token"],"0123456789abcdef")
                self.assertEqual(r["stop_conditions"],["job-a exit 0"])

    def test_degraded_context_requires_reasoned_new_chat(self):
        with tempfile.TemporaryDirectory() as raw:
            with patch.object(h,"HANDOFFS",Path(raw)), patch.object(h,"git_snapshot",return_value={"head":"a","status":""}), patch.object(h.reload_guard,"read_state",return_value={"loaded_digest":"same"}), patch.object(h.reload_guard,"source_digest",return_value="same"):
                r=h.create(context_health="degraded")
                self.assertTrue(r["new_chat_required"])
                self.assertEqual(r["new_chat_reason"],"context_or_stream_degraded")
                self.assertFalse(r["same_chat_continuation_allowed"])

    def test_v3_inspection_receipt_is_client_readable(self):
        import context_algebra as a
        ent=a.entity("scope",{"scheme":"canonical-uri","value":"corpus://A"})
        old=a.assertion(ent["entity_id"],"scope.state","stable")
        graph=a.graph(entities=[ent],assertions=[old])
        with tempfile.TemporaryDirectory() as raw:
            with patch.object(h,"HANDOFFS",Path(raw)), patch.object(h,"git_snapshot",return_value={"head":"a","status":""}), patch.object(h.reload_guard,"read_state",return_value={"loaded_digest":"same"}), patch.object(h.reload_guard,"source_digest",return_value="same"):
                r=h.create(context_graph=graph,projection_roots=[ent["entity_id"]])
                resumed=h.resume(r["handoff_id"],current_context_graph=graph)
                view=resumed["inspection_receipt"]
                self.assertTrue(view["projection_roots"][0]["resumable"])
                self.assertTrue(view["projection_roots"][0]["still_valid"])
                self.assertEqual(view["projection_roots"][0]["canonical_identity"]["value"],"corpus://A")
                self.assertEqual(view["stale"],{"assertions":[],"relations":[]})
                self.assertIn(old["assertion_id"],view["historical_projection_preserved"]["assertions"])

    def test_bad_id_refused(self):
        with self.assertRaises(ValueError): h.resume("../x")
if __name__=="__main__": unittest.main()
