import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import workflow_verifier as v


def call(tool, data, status='completed', **extra):
    return {'tool': tool, 'state': {'status': status, 'input': data, **extra}}


class WorkflowVerifierTests(unittest.TestCase):
    def payload(self, calls, outcome='completed'):
        return {'profile': v.PROFILE_ID, 'report': {'outcome': outcome, 'tool_calls': calls}}

    def chain(self, context, fixture, test):
        return [call('read', {'filePath': str(context)}), call('read', {'filePath': str(fixture)}),
                call('edit', {'filePath': str(fixture)}),
                call('bash', {'command': 'python3 ' + str(test)}, output='MIGRATION_SMOKE_PASS\n', metadata={'exit': 0})]

    def test_full_receipt_and_current_fixture_are_distinct(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); context = root/'context'; fixture = root/'fixture.py'; test = root/'test.py'; baseline = root/'before.json'
            context.write_text('context'); fixture.write_text('def fits_context(input_tokens, output_tokens):\n return True\n'); test.write_text('test')
            baseline.write_text(json.dumps({'.migration-smoke/runtime_limits.py': hashlib.sha256(b'old').hexdigest()}))
            with patch.multiple(v, CONTEXT=context, FIXTURE=fixture, TEST=test, BASELINE=baseline):
                value = v.verify(self.payload(self.chain(context, fixture, test)))
            self.assertTrue(value['execution_receipt']['execution_chain_verified'])
            self.assertFalse(value['current_fixture']['matches_initial_baseline'])
            self.assertTrue(value['current_fixture']['declares_fits_context'])
            self.assertIn('réponse à relire', value['conclusion'])

    def test_unfinished_or_unknown_payload_is_rejected_or_unverified(self):
        with self.assertRaisesRegex(ValueError, 'Fin de conversation'):
            v.report_from_payload({'profile': v.PROFILE_ID, 'report': {'outcome': 'forged', 'tool_calls': []}})
        value = v.verify(self.payload([], 'interrupted'))
        self.assertFalse(value['execution_receipt']['execution_chain_verified'])
        self.assertEqual(value['conclusion'], 'chaîne d’exécution non vérifiée ; voir les étapes manquantes')

    def test_input_is_bounded_and_untrusted_fields_are_dropped(self):
        call_data = call('bash', {'command': 'python3 /test', 'evil': 'discard'}, output='safe', metadata={'exit': 0, 'other': 'discard'})
        report = v.report_from_payload(self.payload([call_data]))
        self.assertEqual(report['tool_calls'][0]['state']['input'], {'command': 'python3 /test'})
        self.assertEqual(report['tool_calls'][0]['state']['metadata'], {'exit': 0})
        with self.assertRaisesRegex(ValueError, 'Nombre'):
            v.report_from_payload(self.payload([call_data] * 101))

    def test_durable_result_requires_a_normalized_agent_report(self):
        self.assertEqual(v.durable_payload({'agent_report': {'outcome':'unknown','tool_calls':[]}}), self.payload([], 'unknown'))
        value=v.durable_payload({'agent_report': {'outcome':'completed','tool_calls':[]}, 'started_at':10.0, 'finished_at':12.3456})
        self.assertEqual(value['report']['elapsed_seconds'],2.346)
        with self.assertRaisesRegex(ValueError, 'Rapport durable'):
            v.durable_payload({'messages': []})


if __name__ == '__main__':
    unittest.main()
