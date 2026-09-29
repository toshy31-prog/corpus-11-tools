import ast
import json
from pathlib import Path
import unittest
from unittest.mock import patch

import corpus_gpt_job_policy as job_policy

HERE=Path(__file__).resolve().parent
SOURCE=HERE/"corpus_gpt_mcp.py"

def nodes():
    tree=ast.parse(SOURCE.read_text(encoding="utf-8"))
    wanted={}
    for node in tree.body:
        if isinstance(node,ast.FunctionDef) and node.name in {"result","call"}:
            wanted[node.name]=node
    return wanted

def exposed_call(allowed):
    ns={
        "json":json,
        "job_policy":job_policy,
        "JOB_POLICY":Path("/nonexistent/job-policy.json"),
        "safe_jobs":lambda:list(allowed),
    }
    got=nodes()
    module=ast.Module(body=[got["result"],got["call"]],type_ignores=[])
    exec(compile(module,str(SOURCE),"exec"),ns)
    return ns["call"]

def payload(value):
    return json.loads(value["content"][0]["text"])

class JobInfoEffectMcpSurfaceTests(unittest.TestCase):
    def setUp(self):
        self.registry={
            "legacy":{"kind":"local"},
            "annotated":{"kind":"browser","effects":["repo_write","filesystem_write"]},
            "writejob":{"kind":"local","effects":["repo_write"],"write_set":["b","a"]},
        }
        self.call=exposed_call(self.registry)

    def test_absent_job_keeps_exists_false_without_effect(self):
        with patch.object(job_policy,"load",side_effect=AssertionError("registry must not load for absent job")):
            value=payload(self.call("job_info",{"job":"missing"}))
        self.assertEqual(value,{"job":"missing","exists":False})
        self.assertNotIn("effect",value)

    def test_legacy_job_projects_unknown(self):
        with patch.object(job_policy,"load",return_value=self.registry) as load:
            value=payload(self.call("job_info",{"job":"legacy"}))
        self.assertEqual(load.call_count,1)
        self.assertEqual(value["kind"],"local")
        self.assertEqual(value["effect"],{"status":"unknown","effects":[]})

    def test_annotated_job_projects_attested_effects_exactly(self):
        with patch.object(job_policy,"load",return_value=self.registry) as load:
            value=payload(self.call("job_info",{"job":"annotated"}))
        self.assertEqual(load.call_count,1)
        self.assertEqual(value["effect"],{"status":"attested","effects":["filesystem_write","repo_write"]})

    def test_write_set_is_owner_projection(self):
        with patch.object(job_policy,"load",return_value=self.registry) as load:
            value=payload(self.call("job_info",{"job":"writejob"}))
        self.assertEqual(load.call_count,1)
        self.assertEqual(value["effect"],{"status":"attested","effects":["repo_write"],"write_set":["a","b"]})

    def test_job_info_branch_contains_no_execution_path(self):
        src=SOURCE.read_text(encoding="utf-8")
        start=src.index('    if name == "job_info":')
        end=src.index('    if name == "capabilities":',start)
        branch=src[start:end]
        self.assertIn("job_policy.effect_projection(job,registry)",branch)
        for forbidden in ("run_job(", "start_job(", "subprocess.", "Popen(", "run(["):
            self.assertNotIn(forbidden,branch)

if __name__=="__main__":
    unittest.main()
