import unittest
from workflow_receipt import evaluate


def call(tool, data, status='completed', **extra):
    return {'tool': tool, 'state': {'status': status, 'input': data, **extra}}


class WorkflowReceiptTests(unittest.TestCase):
    def result(self, calls, outcome='completed'):
        return evaluate({'outcome': outcome, 'tool_calls': calls}, context_path='/context',
                        fixture_path='/fixture', test_command='python3 /test')

    def chain(self):
        return [call('read', {'filePath': '/context'}),
                call('read', {'filePath': '/fixture'}),
                call('edit', {'filePath': '/fixture'}),
                call('bash', {'command': 'python3 /test'},
                     output='MIGRATION_SMOKE_PASS\n', metadata={'exit': 0})]

    def test_real_chain_is_not_semantic_admission(self):
        r = self.result(self.chain())
        self.assertTrue(r['execution_chain_verified'])
        self.assertEqual(r['semantic_answer_review'], 'required_separately')

    def test_idle_or_pending_is_not_an_edit(self):
        calls = self.chain(); calls[2]['state']['status'] = 'pending'
        self.assertFalse(self.result(calls)['execution_chain_verified'])
        self.assertFalse(self.result([])['execution_chain_verified'])

    def test_forged_marker_wrong_command_or_failed_process(self):
        for field, value in [('command', 'echo MIGRATION_SMOKE_PASS'), ('exit', 1), ('exit', None)]:
            calls = self.chain()
            if field == 'command': calls[-1]['state']['input'][field] = value
            else: calls[-1]['state']['metadata'][field] = value
            self.assertFalse(self.result(calls)['execution_chain_verified'])

    def test_test_before_edit_is_not_accepted(self):
        calls = self.chain()
        self.assertFalse(self.result(calls[:2]+[calls[3],calls[2]])['execution_chain_verified'])

    def test_extra_edit_or_timeout_is_not_accepted(self):
        self.assertFalse(self.result(self.chain()+[call('write', {'filePath': '/other'})])['execution_chain_verified'])
        self.assertFalse(self.result(self.chain(), 'time_budget_exceeded')['execution_chain_verified'])

    def test_success_cannot_cover_a_later_edit_or_failed_test(self):
        calls = self.chain()
        later_edit = call('edit', {'filePath': '/fixture'})
        self.assertFalse(self.result(calls+[later_edit])['execution_chain_verified'])
        self.assertTrue(self.result(calls+[later_edit, calls[-1]])['execution_chain_verified'])
        failed = call('bash', {'command': 'python3 /test'}, output='failed', metadata={'exit': 1})
        self.assertFalse(self.result(calls+[failed])['execution_chain_verified'])
        self.assertFalse(self.result(calls+[call('edit', {'filePath': '/fixture'}, 'pending')])['execution_chain_verified'])

if __name__ == '__main__': unittest.main()
