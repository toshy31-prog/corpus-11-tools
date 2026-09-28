import json, tempfile, unittest
from pathlib import Path
from unittest.mock import patch

import context_algebra as a
import capability_handoff as h

class ContextAlgebraTests(unittest.TestCase):
    def ev(self,name):
        return a.evidence("test",digest=name,evidence_id="ev:"+name)

    def base_entities(self):
        repo=a.entity("repository",{"scheme":"canonical-uri","value":"file:///r"},display_name="same")
        wt=a.entity("worktree",{"scheme":"repo-relative-worktree","value":{"repo":repo["entity_id"],"path":"."}},display_name="same")
        src=a.entity("source_state",{"scheme":"content-digest","value":"A"})
        run=a.entity("runtime",{"scheme":"runtime-instance","value":"runtime-1"},display_name="same")
        surf=a.entity("mcp_surface",{"scheme":"surface-instance","value":"surface-1"})
        c1=a.entity("conversation",{"scheme":"conversation-id","value":"c1"})
        return repo,wt,src,run,surf,c1

    def test_A_other_scope_change_does_not_invalidate_projection(self):
        repo,wt,src,run,surf,c1=self.base_entities()
        repo_b=a.entity("repository",{"scheme":"canonical-uri","value":"file:///other"},display_name="same")
        src_b=a.entity("source_state",{"scheme":"content-digest","value":"B"})
        e=self.ev("A")
        fact=a.assertion(src["entity_id"],"source.digest","A",evidence_refs=[e["evidence_id"]])
        rel=a.relation(wt["entity_id"],"belongs_to",repo["entity_id"])
        g=a.graph(entities=[repo,wt,src,run,surf,c1,repo_b,src_b],assertions=[fact],relations=[rel],evidence_items=[e])
        p=a.project(g,[src["entity_id"]])
        changed=a.graph(entities=[repo,wt,src,run,surf,c1,repo_b,a.entity("source_state",{"scheme":"content-digest","value":"C"})],assertions=[fact],relations=[rel],evidence_items=[e])
        self.assertTrue(a.reconcile(p,changed)["compatible"])
        self.assertNotIn(repo_b["entity_id"],{x["entity_id"] for x in p["entities"]})

    def test_B_source_changes_runtime_history_remains_and_match_becomes_stale(self):
        repo,wt,src,run,surf,c1=self.base_entities(); e=self.ev("B")
        source_a=a.assertion(src["entity_id"],"source.digest","A",evidence_refs=[e["evidence_id"]])
        loaded=a.assertion(run["entity_id"],"runtime.loaded_digest","A",evidence_refs=[e["evidence_id"]])
        match=a.assertion(run["entity_id"],"runtime.matches_source",True,depends_on=[{"role":"runtime_digest","ref":loaded["assertion_id"]},{"role":"source_digest","ref":source_a["assertion_id"]}],evidence_refs=[e["evidence_id"]])
        g=a.graph(entities=[repo,wt,src,run,surf,c1],assertions=[source_a,loaded,match],evidence_items=[e])
        p=a.project(g,[run["entity_id"]])
        source_b=a.assertion(src["entity_id"],"source.digest","B",supersedes=[source_a["assertion_id"]],evidence_refs=[e["evidence_id"]])
        cur=a.graph(entities=[repo,wt,src,run,surf,c1],assertions=[source_b,loaded],evidence_items=[e])
        r=a.reconcile(p,cur)
        self.assertEqual(r["assertions"][loaded["assertion_id"]],"still_valid")
        self.assertEqual(r["assertions"][source_a["assertion_id"]],"superseded")
        self.assertEqual(r["assertions"][match["assertion_id"]],"stale")

    def test_C_D_runtime_reload_does_not_rewrite_old_conversation_surface(self):
        repo,wt,src,run,surf1,c1=self.base_entities(); e=self.ev("CD")
        old=a.assertion(surf1["entity_id"],"surface.schema_digest","old",evidence_refs=[e["evidence_id"]])
        loaded_old=a.assertion(run["entity_id"],"runtime.loaded_digest","A",evidence_refs=[e["evidence_id"]])
        observes1=a.relation(c1["entity_id"],"observes",surf1["entity_id"])
        loaded_new=a.assertion(run["entity_id"],"runtime.loaded_digest","B",supersedes=[loaded_old["assertion_id"]],evidence_refs=[e["evidence_id"]])
        surf2=a.entity("mcp_surface",{"scheme":"surface-instance","value":"surface-2"})
        c2=a.entity("conversation",{"scheme":"conversation-id","value":"c2"})
        new=a.assertion(surf2["entity_id"],"surface.schema_digest","new",evidence_refs=[e["evidence_id"]])
        observes2=a.relation(c2["entity_id"],"observes",surf2["entity_id"])
        cur=a.graph(entities=[repo,wt,src,run,surf1,c1,surf2,c2],assertions=[old,loaded_new,new],relations=[observes1,observes2],evidence_items=[e])
        self.assertEqual(old["value"],"old")
        self.assertNotEqual(surf1["entity_id"],surf2["entity_id"])
        self.assertNotEqual(c1["entity_id"],c2["entity_id"])
        self.assertIn(observes1["relation_id"],{x["relation_id"] for x in cur["relations"]})

    def test_E_test_pass_is_bound_to_code_runtime_and_scenario(self):
        repo,wt,src,run,surf,c1=self.base_entities(); e=self.ev("E")
        scenario=a.entity("scenario",{"scheme":"scenario-digest","value":"s1"})
        execution=a.entity("test_execution",{"scheme":"execution-id","value":"t1"})
        code=a.assertion(src["entity_id"],"source.digest","A",evidence_refs=[e["evidence_id"]])
        runtime=a.assertion(run["entity_id"],"runtime.loaded_digest","A",evidence_refs=[e["evidence_id"]])
        passed=a.assertion(execution["entity_id"],"test.result",{"status":"pass","passed":33,"total":33},depends_on=[{"role":"code","ref":code["assertion_id"]},{"role":"runtime","ref":runtime["assertion_id"]},{"role":"scenario","ref":scenario["entity_id"]}],evidence_refs=[e["evidence_id"]])
        g=a.graph(entities=[repo,wt,src,run,surf,c1,scenario,execution],assertions=[code,runtime,passed],evidence_items=[e])
        p=a.project(g,[execution["entity_id"]])
        self.assertEqual({d["role"] for d in p["assertions"][-1]["depends_on"]} if p["assertions"][-1]["predicate"]=="test.result" else {d["role"] for x in p["assertions"] if x["predicate"]=="test.result" for d in x["depends_on"]},{"code","runtime","scenario"})

    def test_F_roundtrip_no_nominal_merge_and_v2_compat(self):
        x=a.entity("repository",{"scheme":"canonical-uri","value":"file:///x"},display_name="main")
        y=a.entity("repository",{"scheme":"canonical-uri","value":"file:///y"},display_name="main")
        e=self.ev("F")
        ax=a.assertion(x["entity_id"],"legacy.validation","PASS X",evidence_refs=[e["evidence_id"]])
        g=a.graph(entities=[x,y],assertions=[ax],evidence_items=[e])
        self.assertNotEqual(x["entity_id"],y["entity_id"])
        with tempfile.TemporaryDirectory() as raw:
            with patch.object(h,"HANDOFFS",Path(raw)), patch.object(h,"git_snapshot",return_value={"head":"a","status":""}), patch.object(h.reload_guard,"read_state",return_value={"loaded_digest":"same"}), patch.object(h.reload_guard,"source_digest",return_value="same"):
                receipt=h.create(context_graph=g,projection_roots=[x["entity_id"]])
                self.assertEqual(receipt["schema_version"],3)
                self.assertEqual(receipt["validations"],["PASS X"])
                resumed=h.resume(receipt["handoff_id"],current_context_graph=g)
                self.assertTrue(resumed["compatible"])
                self.assertNotIn(y["entity_id"],resumed["reconciliation"]["entities"])
                legacy=h.create(validations=["legacy"])
                self.assertEqual(legacy["schema_version"],2)
                self.assertTrue(h.resume(legacy["handoff_id"])["compatible"])

    def test_explicit_invalidation_is_not_supersession(self):
        ent=a.entity("task",{"scheme":"id","value":"x"}); e=self.ev("I")
        old=a.assertion(ent["entity_id"],"task.state","ready",evidence_refs=[e["evidence_id"]])
        invalidator=a.assertion(ent["entity_id"],"task.invalidation","unsafe",invalidates=[old["assertion_id"]],evidence_refs=[e["evidence_id"]])
        p=a.project(a.graph(entities=[ent],assertions=[old],evidence_items=[e]),[ent["entity_id"]])
        cur=a.graph(entities=[ent],assertions=[invalidator],evidence_items=[e])
        self.assertEqual(a.reconcile(p,cur)["assertions"][old["assertion_id"]],"invalidated")

if __name__=="__main__": unittest.main()
