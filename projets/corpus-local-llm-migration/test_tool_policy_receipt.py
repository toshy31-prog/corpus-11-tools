import json
import unittest
from unittest.mock import patch

from tool_policy_receipt import catalog_provenance, snapshot
import tool_router_runtime as router


class ToolPolicyReceiptTests(unittest.TestCase):
    def setUp(self):
        self.catalog = json.loads(router.CATALOG_PATH.read_text())

    def test_snapshot_is_stable_redacted_and_distinguishes_execution(self):
        receipt = snapshot(catalog=self.catalog, mode='enforce', enabled_tools=['read', 'edit'], forbidden_namespaces=['ssh'])
        self.assertEqual(receipt['schema_version'], 1)
        self.assertEqual(receipt['boundary'], 'tool_exposure')
        self.assertEqual([row['name'] for row in receipt['enabled_tools']], ['edit', 'read'])
        self.assertEqual(receipt['forbidden_namespaces'], ['ssh'])
        self.assertEqual(receipt['execution_permission']['status'], 'not_observed_at_router')
        self.assertEqual(receipt['catalog']['catalog_sha256'], catalog_provenance(self.catalog)['catalog_sha256'])
        rendered = json.dumps(receipt, ensure_ascii=False)
        self.assertNotIn('message', rendered.casefold())
        self.assertNotIn('session', rendered.casefold())

    def test_router_attaches_policy_to_computed_route_without_router_model(self):
        raw = json.dumps({'agent': 'corpus', 'parts': [{'type': 'text', 'text': 'Lis le fichier local.'}]}).encode()
        decision = {'namespaces': ['files'], 'forbidden': ['ssh'], 'semantic_used': False}
        with patch.object(router, 'mode', return_value='enforce'), patch.object(router, 'route_text', return_value=decision), patch.object(router, '_log'):
            _, receipt = router.route_opencode_body(raw)
        policy = receipt['tool_policy']
        self.assertEqual(policy['router_mode'], 'enforce')
        self.assertEqual(policy['forbidden_namespaces'], ['ssh'])
        self.assertIn('read', [row['name'] for row in policy['enabled_tools']])
        self.assertEqual(policy['execution_permission']['status'], 'not_observed_at_router')

    def test_explicit_scope_has_auditable_but_not_granted_policy(self):
        raw = json.dumps({'agent': 'corpus', 'tools': {'read': True, 'edit': False}, 'parts': []}).encode()
        with patch.object(router, 'mode', return_value='enforce'), patch.object(router, '_log'):
            output, receipt = router.route_opencode_body(raw)
        self.assertEqual(output, raw)
        self.assertEqual(receipt['enabled_tools'], ['read'])
        self.assertEqual(receipt['tool_policy']['source'], 'caller_supplied_mask')
        self.assertEqual(receipt['tool_policy']['execution_permission']['status'], 'not_observed_at_router')


if __name__ == '__main__':
    unittest.main()
