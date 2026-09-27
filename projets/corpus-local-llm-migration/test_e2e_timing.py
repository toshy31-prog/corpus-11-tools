import unittest

from e2e_timing import summarize


class E2ETimingTests(unittest.TestCase):
    def test_keeps_tool_time_separate_from_assistant_turns(self):
        receipt = {'messages': [
            {'info': {'id': 'user', 'role': 'user', 'time': {'created': 1_000_000_000_000}}},
            {'info': {'role': 'assistant', 'parentID': 'user', 'finish': 'tool-calls', 'time': {'created': 1_000_000_000_100, 'completed': 1_000_000_005_100}},
             'parts': [{'type': 'tool', 'tool': 'read', 'state': {'status': 'completed', 'time': {'start': 1_000_000_005_000, 'end': 1_000_000_005_200}}}]},
            {'info': {'role': 'assistant', 'parentID': 'user', 'finish': 'stop', 'time': {'created': 1_000_000_005_200, 'completed': 1_000_000_006_200}}, 'parts': []},
        ]}
        result = summarize(receipt)
        self.assertEqual(result['wall_seconds_from_transcript'], 6.2)
        self.assertEqual(result['assistant_turn_seconds'], 6.0)
        self.assertEqual(result['recorded_tool_execution_seconds'], 0.2)
        self.assertEqual(result['assistant_turn_seconds_excluding_recorded_tools'], 5.8)

    def test_rejects_missing_user_turn(self):
        with self.assertRaisesRegex(ValueError, 'utilisateur'):
            summarize({'messages': []})
