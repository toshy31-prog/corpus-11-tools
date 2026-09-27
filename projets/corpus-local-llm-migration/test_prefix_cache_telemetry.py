import json
import tempfile
import unittest
from pathlib import Path

import prefix_cache_telemetry as telemetry


class PrefixCacheTelemetryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'prefix-cache.json'
        telemetry._SESSIONS.clear()

    def tearDown(self):
        telemetry._SESSIONS.clear()
        self.tmp.cleanup()

    def body(self, *, model='qwen', tools=None, text='secret request', file=False,
             system='private instructions', synthetic='private current-turn context'):
        parts = [{'type': 'text', 'synthetic': True, 'text': synthetic},
                 {'type': 'text', 'text': text}]
        if file:
            parts.append({'type': 'file', 'filename': 'private.pdf', 'mime': 'application/pdf'})
        return json.dumps({'agent': 'corpus', 'model': {'providerID': 'local', 'modelID': model},
                           'variant': 'direct', 'system': system,
                           'tools': tools, 'parts': parts}).encode()

    def test_same_session_shape_is_candidate_without_persisting_contents_or_identifier(self):
        first = self.body()
        second = self.body(text='different private text')
        self.assertTrue(telemetry.observe('session-private-id', first, self.path))
        self.assertTrue(telemetry.observe('session-private-id', second, self.path))
        result = telemetry.summary(self.path)
        counters = result['counters']
        self.assertEqual(counters['requests_observed'], 2)
        self.assertEqual(counters['continuations_observed'], 1)
        self.assertEqual(counters['prefix_candidates'], 1)
        self.assertEqual(counters['actual_cache_hits_observed'], 0)
        self.assertEqual(counters['routed_payload_bytes_total'], len(first) + len(second))
        self.assertEqual(counters['routed_payload_bytes_max'], max(len(first), len(second)))
        self.assertEqual(result['average_routed_payload_bytes'], round((len(first) + len(second)) / 2))
        serialized = self.path.read_text()
        for forbidden in ('secret request', 'different private text', 'private instructions', 'private.pdf', 'session-private-id'):
            self.assertNotIn(forbidden, serialized)
        self.assertIn('candidate_only', result['scope'])

    def test_changed_configuration_is_not_candidate_and_attachments_are_aggregate_only(self):
        telemetry.observe('s', self.body(tools={'read': True, 'bash': False}, file=True), self.path)
        telemetry.observe('s', self.body(model='other', tools={'read': True, 'bash': False}), self.path)
        counters = telemetry.summary(self.path)['counters']
        self.assertEqual(counters['continuations_observed'], 1)
        self.assertEqual(counters['prefix_candidates'], 0)
        self.assertEqual(counters['configuration_changed'], 1)
        self.assertEqual(counters['attachments_present'], 1)

    def test_changed_invariant_instructions_are_not_a_prefix_candidate(self):
        telemetry.observe('s', self.body(system='instruction stable A'), self.path)
        telemetry.observe('s', self.body(text='same user shape', system='instruction stable B'), self.path)
        counters = telemetry.summary(self.path)['counters']
        self.assertEqual(counters['continuations_observed'], 1)
        self.assertEqual(counters['prefix_candidates'], 0)
        self.assertEqual(counters['configuration_changed'], 1)
        serialized = self.path.read_text()
        self.assertNotIn('instruction stable A', serialized)
        self.assertNotIn('instruction stable B', serialized)

    def test_current_turn_synthetic_context_is_not_mistaken_for_session_prefix(self):
        telemetry.observe('s', self.body(synthetic='date du premier tour'), self.path)
        telemetry.observe('s', self.body(text='autre question', synthetic='date du second tour'), self.path)
        counters = telemetry.summary(self.path)['counters']
        self.assertEqual(counters['continuations_observed'], 1)
        self.assertEqual(counters['prefix_candidates'], 1)
        serialized = self.path.read_text()
        self.assertNotIn('date du premier tour', serialized)
        self.assertNotIn('date du second tour', serialized)

    def test_identical_attachment_shape_is_observed_but_not_a_candidate(self):
        telemetry.observe('s', self.body(file=True), self.path)
        telemetry.observe('s', self.body(file=True, text='another secret'), self.path)
        counters = telemetry.summary(self.path)['counters']
        self.assertEqual(counters['continuations_observed'], 1)
        self.assertEqual(counters['prefix_candidates'], 0)
        self.assertEqual(counters['attachments_present'], 2)

    def test_invalid_body_never_creates_record(self):
        self.assertFalse(telemetry.observe('s', b'not json', self.path))
        self.assertFalse(self.path.exists())


if __name__ == '__main__':
    unittest.main()
