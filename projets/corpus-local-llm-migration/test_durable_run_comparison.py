import unittest

from durable_run_comparison import compare


class DurableRunComparisonTests(unittest.TestCase):
    def receipt(self, tool_names, finish=1_000_000_006_000):
        parts = []
        for index, name in enumerate(tool_names):
            start = 1_000_000_001_000 + index * 100
            parts.append({'type': 'tool', 'tool': name, 'state': {
                'status': 'completed', 'time': {'start': start, 'end': start + 50}}})
        return {'state': 'completed', 'agent_report': {'outcome': 'completed'}, 'messages': [
            {'info': {'id': 'user', 'role': 'user', 'time': {'created': 1_000_000_000_000}}},
            {'info': {'role': 'assistant', 'parentID': 'user', 'finish': 'stop',
                      'time': {'created': 1_000_000_000_100, 'completed': finish}}, 'parts': parts},
        ]}

    def test_reports_time_delta_without_causal_claim(self):
        result = compare(self.receipt(['read'], 1_000_000_006_000), self.receipt(['read'], 1_000_000_009_000))
        self.assertEqual(result['delta']['wall_seconds_from_transcript']['candidate_minus_baseline_seconds'], 3.0)
        self.assertEqual(result['causal_attribution'], 'not_performed')
        self.assertEqual(result['comparability_state'], 'insufficient_for_attribution')
        self.assertEqual(result['qwen_request'], 'none')
        self.assertTrue(result['receipt_readiness']['baseline']['usable_for_descriptive_latency'])

    def test_tool_order_and_terminal_outcome_are_required_for_comparability(self):
        declaration = {field: True for field in (
            'same_prompt', 'same_fixture', 'same_model', 'same_runtime',
            'same_tool_profile', 'same_verifier_contract',
        )}
        result = compare(self.receipt(['read', 'edit', 'bash']), self.receipt(['read', 'bash', 'edit']),
                         comparability=declaration)
        self.assertFalse(result['comparability_checks']['same_tool_sequence'])
        self.assertEqual(result['comparability_state'], 'insufficient_for_attribution')

        failed = self.receipt(['read'])
        failed['state'] = 'failed'
        failed['agent_report']['outcome'] = 'failed'
        result = compare(self.receipt(['read']), failed, comparability=declaration)
        self.assertFalse(result['receipt_readiness']['candidate']['usable_for_descriptive_latency'])
        self.assertFalse(result['comparability_checks']['same_terminal_outcome'])

    def test_visible_tool_difference_blocks_declared_equivalence(self):
        declaration = {field: True for field in ('same_prompt', 'same_fixture', 'same_model', 'same_runtime', 'same_tool_profile')}
        result = compare(self.receipt(['read'], 1_000_000_006_000), self.receipt(['read', 'edit'], 1_000_000_009_000), comparability=declaration)
        self.assertFalse(result['comparability_checks']['same_tool_profile'])
        self.assertEqual(result['comparability_state'], 'insufficient_for_attribution')

    def test_snapshot_never_contains_message_text_or_session_id(self):
        baseline = self.receipt(['read'])
        baseline['session_id'] = 'private-session'
        baseline['messages'][0]['parts'] = [{'type': 'text', 'text': 'private prompt'}]
        result = compare(baseline, self.receipt(['read']))
        encoded = str(result)
        self.assertNotIn('private-session', encoded)
        self.assertNotIn('private prompt', encoded)


if __name__ == '__main__':
    unittest.main()
