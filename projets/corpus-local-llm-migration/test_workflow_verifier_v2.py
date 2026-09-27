import json
import unittest
from pathlib import Path

from workflow_verifier_v2 import MARKER, TEST_COMMAND, verify

HERE = Path(__file__).resolve().parent
RESULT = HERE / '.migration-smoke/durable-e2e-v2-result.json'
FIXTURE = str(HERE / '.migration-smoke/runtime_limits_v2.py')
CONTEXT = str(HERE / 'CONTEXTE_LOCAL.md')
TEST = str(HERE / '.migration-smoke/test_budget_v2.py')


def call(tool, source, *, output='', status='completed', metadata=None):
    state = {'status': status, 'input': source, 'output': output}
    if metadata is not None:
        state['metadata'] = metadata
    return {'tool': tool, 'state': state}


def receipt(calls):
    return {'agent_report': {'outcome': 'completed', 'tool_calls': calls}}


class DurableV2VerifierTests(unittest.TestCase):
    def chain(self):
        return [call('read', {'filePath': CONTEXT}), call('read', {'filePath': FIXTURE}),
                call('read', {'filePath': TEST}), call('edit', {'filePath': FIXTURE}),
                call('bash', {'command': TEST_COMMAND}, output=MARKER + '\n', metadata={'exit': 0})]

    def test_expected_chain_is_accepted_and_bounded(self):
        result = verify(receipt(self.chain()))
        self.assertEqual(result['verification_state'], 'receipt_chain_verified')
        self.assertEqual(result['target']['fixture_path'], FIXTURE)
        self.assertEqual(result['target']['test_command'], TEST_COMMAND)
        self.assertTrue(result['current_fixture']['declares_fits_context'])

    def test_wrong_marker_target_or_failed_tool_is_rejected(self):
        for change in ('marker', 'target', 'failed'):
            calls = self.chain()
            if change == 'marker':
                calls[-1]['state']['output'] = 'MIGRATION_SMOKE_PASS\n'
            elif change == 'target':
                calls[3]['state']['input']['filePath'] = '/outside'
            else:
                calls[-1]['state']['status'] = 'failed'
            self.assertEqual(verify(receipt(calls))['verification_state'], 'receipt_chain_unverified')

    def test_real_durable_v2_receipt_is_checked_without_execution(self):
        result = verify(json.loads(RESULT.read_text()))
        self.assertEqual(result['verification_state'], 'receipt_chain_verified')
        self.assertIn('aucune commande', ' '.join(result['limits']))


if __name__ == '__main__':
    unittest.main()
