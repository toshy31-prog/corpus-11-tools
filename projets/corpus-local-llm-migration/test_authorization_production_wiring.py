import ast
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import Mock, patch

import authorization_owner as owner
import authorized_async_gate as gate
import corpus_gpt_job_policy as policy

HERE=Path(__file__).resolve().parent
MCP_SOURCE=HERE/"corpus_gpt_mcp.py"

class AuthorizationProductionWiringTests(unittest.TestCase):
    def test_P1_P4_registry_contract_is_strict(self):
        self.assertFalse(policy.requires_durable_authorization("x",{"x":{"kind":"local"}}))
        self.assertTrue(policy.requires_durable_authorization("x",{"x":{"requires_durable_authorization":True}}))
        self.assertFalse(policy.requires_durable_authorization("x",{"x":{"requires_durable_authorization":False}}))
        with self.assertRaises(ValueError):
            policy.requires_durable_authorization("x",{"x":{"requires_durable_authorization":"true"}})
        self.assertTrue(policy.authorization_requirement_from_content("#!/usr/bin/env bash\n# corpus-requires-durable-authorization: true\n"))
        self.assertFalse(policy.authorization_requirement_from_content("#!/usr/bin/env bash\n# corpus-requires-durable-authorization: false\n"))
        self.assertFalse(policy.authorization_requirement_from_content("#!/usr/bin/env bash\n"))
        with self.assertRaises(ValueError):
            policy.authorization_requirement_from_content("#!/usr/bin/env bash\n# corpus-requires-durable-authorization: yes\n")

    def test_P5_P6_mcp_source_wires_gate_registry_and_explicit_config(self):
        source=MCP_SOURCE.read_text()
        for required in [
            "import authorized_async_gate as auth_gate",
            'AUTHORIZATION_CONFIG = BB / "state/authorization.json"',
            "registry = job_policy.load(JOB_POLICY)",
            "value = auth_gate.start_job_configured(",
            "job_registry=registry",
            "authorization_config_path=AUTHORIZATION_CONFIG",
            "requires_auth = job_policy.authorization_requirement_from_content(content)",
            '"requires_durable_authorization":requires_auth',
        ]:
            self.assertIn(required,source)
        self.assertLess(
            source.index("requires_auth = job_policy.authorization_requirement_from_content(content)"),
            source.index("tp.replace(dest)"),
        )

    def test_P7_missing_config_fails_closed_only_for_protected_job(self):
        with tempfile.TemporaryDirectory() as raw:
            config=Path(raw)/"missing.json"
            with patch.object(gate.async_jobs,"existing_active_job",return_value=None), patch.object(gate,"start_job") as launch:
                with self.assertRaisesRegex(ValueError,"authorization_check_failed"):
                    gate.start_job_configured(
                        "p",allowed_jobs=["p"],entry="e",bb=Path(raw)/"bb",repo=Path(raw),
                        job_registry={"p":{"requires_durable_authorization":True}},
                        authorization_config_path=config,
                        causal_refs={"authorization_ref":"authorization:"+"2"*32})
                launch.assert_not_called()
            expected={"started":True,"existing":False,"token":"b"*16,"job":"u","pid":1,"status":"running","causal_refs":{}}
            with patch.object(gate,"start_job",return_value=expected) as launch:
                got=gate.start_job_configured(
                    "u",allowed_jobs=["u"],entry="e",bb=Path(raw)/"bb",repo=Path(raw),
                    job_registry={"u":{"kind":"local"}},authorization_config_path=config)
            self.assertEqual(got,expected)
            launch.assert_called_once()

    def test_P9_active_protected_is_async_owned_idempotence(self):
        existing={"started":False,"existing":True,"token":"c"*16,"job":"p","pid":9,"status":"running",
                  "causal_refs":{"authorization_ref":"authorization:"+"3"*32}}
        checker=Mock(side_effect=AssertionError("checker must not run"))
        with patch.object(gate.async_jobs,"existing_active_job",return_value=existing) as active, patch.object(gate,"start_job") as launch:
            got=gate.start_job_configured(
                "p",allowed_jobs=["p"],entry="e",bb=Path("/tmp/bb"),repo=Path("/tmp"),
                job_registry={"p":{"requires_durable_authorization":True}},
                authorization_checker=checker,causal_refs=existing["causal_refs"])
        self.assertEqual(got,existing)
        active.assert_called_once()
        launch.assert_not_called()
        checker.assert_not_called()

    def test_P10_active_causal_mismatch_keeps_historical_refusal(self):
        with patch.object(gate.async_jobs,"existing_active_job",side_effect=ValueError("job actif avec causal_refs différents")), patch.object(gate,"start_job") as launch:
            with self.assertRaisesRegex(ValueError,"causal_refs différents"):
                gate.start_job_configured(
                    "p",allowed_jobs=["p"],entry="e",bb=Path("/tmp/bb"),repo=Path("/tmp"),
                    job_registry={"p":{"requires_durable_authorization":True}},
                    causal_refs={"authorization_ref":"authorization:"+"4"*32})
            launch.assert_not_called()

    def test_root_is_explicit_storage_config_not_authorization_identity(self):
        with tempfile.TemporaryDirectory() as raw:
            base=Path(raw); a=base/"a"; b=base/"b"; config=base/"config.json"
            auth=owner.issue_authorization(a,action="start_job",target="p",expires_at=200)
            config.write_text(json.dumps({"authorization_root":str(a)}))
            self.assertEqual(gate.load_authorization_root(config),a)
            b.mkdir(); name=auth["authorization_ref"].split(":",1)[1]+".json"; shutil.copy2(a/name,b/name)
            for root in (a,b):
                self.assertEqual(owner.check_authorization(root,auth["authorization_ref"],action="start_job",target="p",now=100)["status"],"valid")
            config.write_text(json.dumps({"authorization_root":"relative"}))
            with self.assertRaises(ValueError):
                gate.load_authorization_root(config)

    def test_P13_public_start_job_schema_is_unchanged(self):
        tree=ast.parse(MCP_SOURCE.read_text())
        tools=None
        for node in tree.body:
            if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=="TOOLS" for t in node.targets):
                tools=ast.literal_eval(node.value)
                break
        self.assertIsNotNone(tools)
        tool=next(x for x in tools if x["name"]=="start_job")
        schema=tool["inputSchema"]
        self.assertEqual(schema["required"],["job"])
        self.assertEqual(set(schema["properties"]),{"job","causal_refs"})
        self.assertEqual(set(schema["properties"]["causal_refs"]["properties"]),{"decision_ref","authorization_ref","parent_ref","evidence_refs"})

if __name__=="__main__":
    unittest.main()
