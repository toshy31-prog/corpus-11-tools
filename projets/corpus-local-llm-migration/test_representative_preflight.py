import json
import unittest
from pathlib import Path

from prepared_context import prepare_context
from representative_batch_schedule import load_and_validate
from representative_preflight import validate_preflight

HERE = Path(__file__).resolve().parent
CATALOG = json.loads((HERE / 'tool_router_catalog_v2.json').read_text())
PROFILES = json.loads((HERE / 'tool_profiles.json').read_text())


def prepared(profile_id):
    return prepare_context(
        model='qwen-local', profile_id=profile_id, profiles=PROFILES, catalog=CATALOG,
        permissions={'read': 'allow', 'bash': 'ask', 'network': 'deny'},
        invariant_context='Corpus reste local.', user_request='Préparer uniquement.',
        context_items=[{'id': 'fixture', 'kind': 'workspace', 'provenance': 'frozen-fixture',
                        'permission_scope': 'isolated-copy', 'text': 'Contenu de fixture isolé.'}],
    ).receipt()


class RepresentativePreflightTests(unittest.TestCase):
    def setUp(self):
        self.schedule = load_and_validate()
        self.contexts = {
            'C14': prepared('memory'), 'C12': prepared('resume-check'),
            'C05': prepared('edit'), 'C11': prepared('edit'),
        }

    def test_links_every_frozen_case_without_execution(self):
        value = validate_preflight(self.schedule, self.contexts)
        self.assertTrue(value['preflight_valid'])
        self.assertEqual(value['execution'], 'not_started')
        self.assertFalse(value['writes_performed'])
        self.assertEqual([case['scenario_id'] for case in value['cases']], ['C14', 'C12', 'C05', 'C11'])

    def test_missing_or_wrong_profile_fails_closed(self):
        contexts = dict(self.contexts); del contexts['C11']
        value = validate_preflight(self.schedule, contexts)
        self.assertFalse(value['preflight_valid'])
        self.assertIn('prepared_context_case_set_mismatch', value['errors'])
        self.assertIn('prepared_context_missing:C11', value['errors'])
        contexts = dict(self.contexts); contexts['C05'] = prepared('read')
        value = validate_preflight(self.schedule, contexts)
        self.assertFalse(value['preflight_valid'])
        self.assertIn('prepared_context_profile_mismatch:C05', value['errors'])

    def test_raw_context_and_non_preflight_execution_are_refused(self):
        contexts = {key: dict(value) for key, value in self.contexts.items()}
        contexts['C14']['context'] = dict(contexts['C14']['context'])
        contexts['C14']['context']['text'] = 'ne pas exposer'
        value = validate_preflight(self.schedule, contexts)
        self.assertFalse(value['preflight_valid'])
        self.assertIn('prepared_context_contains_raw_text:C14', value['errors'])
        contexts = {key: dict(value) for key, value in self.contexts.items()}
        contexts['C14']['execution'] = 'running'
        value = validate_preflight(self.schedule, contexts)
        self.assertFalse(value['preflight_valid'])
        self.assertIn('prepared_context_execution_invalid:C14', value['errors'])

if __name__ == '__main__':
    unittest.main()
