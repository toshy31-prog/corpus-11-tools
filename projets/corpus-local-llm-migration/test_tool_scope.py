import json
import unittest
from unittest.mock import patch
from tool_scope import with_tools, CATALOG
import tool_router_runtime as router

class ToolScopeTests(unittest.TestCase):
    def setUp(self):
        self.catalog = json.loads(CATALOG.read_text())
        self.body = {'agent':'corpus', 'parts':[{'type':'text','text':'Read, edit and test the known file.'}]}

    def test_existing_router_preserves_exact_scope_without_inference(self):
        scoped = with_tools(self.body, ['read','edit','bash'], self.catalog)
        raw = json.dumps(scoped).encode()
        with patch.object(router, 'mode', return_value='enforce'), patch.object(router, '_log'), patch.object(router, 'route_text', side_effect=AssertionError('No inference/routing expected')):
            output, receipt = router.route_opencode_body(raw)
        self.assertEqual(output, raw)
        self.assertEqual(receipt['event'], 'bypass_explicit_tools')
        self.assertEqual({n for n,v in scoped['tools'].items() if v}, {'read','edit','bash'})
        self.assertNotIn('tools', self.body)
        self.assertEqual(scoped['parts'], self.body['parts'])
        self.assertNotIn('permission', scoped)

    def test_unknown_tools_and_existing_masks_are_rejected(self):
        for body, names in [(self.body, ['typo']), ({**self.body,'tools':{}}, ['read'])]:
            with self.assertRaises(ValueError): with_tools(body, names, self.catalog)

    def test_plan_cannot_enable_tools(self):
        with self.assertRaises(ValueError): with_tools({'agent':'corpus-plan'}, ['read'], self.catalog)
        self.assertFalse(any(with_tools({'agent':'corpus-plan'}, [], self.catalog)['tools'].values()))

if __name__ == '__main__': unittest.main()
