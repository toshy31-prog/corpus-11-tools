import ast
import io
import json
import os
from pathlib import Path
import types
import unittest
from unittest.mock import patch

HERE=Path(__file__).resolve().parent
SOURCE=HERE/"corpus_gpt_mcp.py"

def tree():
    return ast.parse(SOURCE.read_text(encoding="utf-8"))

def function(name):
    return next(n for n in tree().body if isinstance(n,ast.FunctionDef) and n.name==name)

def helpers():
    ns={"json":json,"os":os,"SELF":SOURCE}
    nodes=[function("_local_task_client_allowed"),function("_local_task_catalog_names"),function("_local_task_scope"),function("_local_task_required_tools")]
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(SOURCE),"exec"),ns)
    return ns

def tool_schema():
    for node in ast.walk(tree()):
        if isinstance(node,ast.Call) and isinstance(node.func,ast.Attribute) and node.func.attr=="append":
            if isinstance(node.func.value,ast.Name) and node.func.value.id=="TOOLS" and node.args:
                try:value=ast.literal_eval(node.args[0])
                except Exception:continue
                if isinstance(value,dict) and value.get("name")=="local_task":
                    return value["inputSchema"]
    raise AssertionError("local_task tool definition absent")

class LocalTaskMcpSurfaceTests(unittest.TestCase):
    def test_schema_is_bounded_and_compact(self):
        schema=tool_schema()
        self.assertEqual(schema["required"],["objective"])
        self.assertEqual(set(schema["properties"]),{"objective","context_refs","constraints","session_id","recovery_ref","tool_scope","required_tools"})
        self.assertEqual(schema["properties"]["recovery_ref"]["pattern"],"^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$")
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(schema["properties"]["objective"]["maxLength"],12000)
        self.assertEqual(schema["properties"]["context_refs"]["maxItems"],20)
        self.assertEqual(schema["properties"]["constraints"]["maxItems"],20)
        self.assertEqual(schema["properties"]["tool_scope"]["maxProperties"],100)
        self.assertEqual(schema["properties"]["required_tools"]["maxItems"],20)
        self.assertTrue(schema["properties"]["required_tools"]["uniqueItems"])
        encoded=json.dumps(schema)
        for forbidden in ("transcript","ContextGraph","TaskGraph","agent_config","model_routing"):
            self.assertNotIn(forbidden,encoded)

    def test_default_scope_is_zero_tool_and_explicit_scope_stays_bounded(self):
        ns=helpers()
        scope=ns["_local_task_scope"](None)
        self.assertTrue(scope)
        self.assertFalse(any(scope.values()))
        one=ns["_local_task_scope"]({"read":True})
        self.assertTrue(one["read"])
        self.assertFalse(one["bash"])
        self.assertFalse(one["edit"])
        self.assertFalse(one.get("write",False))
        with self.assertRaises(ValueError): ns["_local_task_scope"]({"surprise":True})
        with self.assertRaises(ValueError): ns["_local_task_scope"]({"read":"true"})
        self.assertEqual(ns["_local_task_required_tools"](["read"],one),["read"])
        with self.assertRaisesRegex(ValueError,"non activés"):
            ns["_local_task_required_tools"](["read"],ns["_local_task_scope"]({"read":False}))
        with self.assertRaisesRegex(ValueError,"inconnus"):
            ns["_local_task_required_tools"](["surprise"],one)
        with self.assertRaisesRegex(ValueError,"invalides"):
            ns["_local_task_required_tools"](["read","read"],one)

    def test_local_opencode_client_is_not_allowed_to_redelegate(self):
        ns=helpers()
        with patch.dict(os.environ,{},clear=True):
            self.assertTrue(ns["_local_task_client_allowed"]())
        with patch.dict(os.environ,{"OPENCODE_TEST_HOME":"/synthetic"},clear=True):
            self.assertFalse(ns["_local_task_client_allowed"]())

    def test_dispatch_is_fixed_repo_sync_bridge_and_compact_result(self):
        source=SOURCE.read_text(encoding="utf-8")
        for fragment in (
            'if name == "local_task":',
            'local_task_bridge.submit_local_task(',
            'directory=str(SELF.parents[2])',
            'session_id=a.get("session_id")',
            'recovery_ref=a.get("recovery_ref")',
            'tool_scope=scope',
            'required_tools=required_tools',
            'deadline=240',
            'value.get("status") != "completed"',
        ):
            self.assertIn(fragment,source)
        block=source[source.index('if name == "local_task":'):source.index('if name == "browser":')]
        self.assertLess(block.index('_local_task_required_tools('),block.index('local_task_bridge.submit_local_task('))
        self.assertNotIn('start_job(', block)

    def test_owner_behaviors_cover_surface_contract(self):
        # Surface-specific test confirms the owner tests remain present rather
        # than duplicating their state machine inside MCP.
        owner=(HERE/"test_local_task_bridge.py").read_text(encoding="utf-8")
        for name in (
            "test_new_session_compact_result_and_no_history_copy",
            "test_continuation_reuses_existing_session_and_targets_only_new_turn",
            "test_tool_scope_is_strict_and_forwarded",
            "test_permission_required_is_distinct_and_never_replied",
            "test_connection_error_is_service_unavailable",
        ):
            self.assertIn(name,owner)

if __name__=="__main__":
    unittest.main()
