import copy
import json
import unittest
from pathlib import Path

from representative_scenarios import load_and_validate, validate_batch

HERE = Path(__file__).resolve().parent

class RepresentativeScenarioTests(unittest.TestCase):
    def setUp(self):
        self.bank = json.loads((HERE / 'SCENARIOS.json').read_text(encoding='utf-8'))
        self.fixtures = json.loads((HERE / 'SCENARIO_FIXTURES.json').read_text(encoding='utf-8'))
        self.catalog = json.loads((HERE / 'tool_router_catalog_v2.json').read_text(encoding='utf-8'))
        self.profiles = json.loads((HERE / 'tool_profiles.json').read_text(encoding='utf-8'))
        self.batch = json.loads((HERE / 'REPRESENTATIVE_SCENARIO_BATCH.json').read_text(encoding='utf-8'))

    def test_current_representative_batch_is_frozen_and_structurally_covered(self):
        result = validate_batch(self.batch, self.bank, self.fixtures, self.catalog, self.profiles)
        self.assertTrue(result['batch_valid'])
        self.assertEqual(result['execution'], 'not_performed')
        self.assertEqual({row['kind'] for row in result['selected']}, {'project_resume', 'admissible_memory', 'authorized_tool', 'controlled_error'})
        self.assertTrue(all(not row['missing_namespaces'] for row in result['selected']))

    def test_stale_fixture_or_executable_batch_is_refused(self):
        stale = copy.deepcopy(self.batch)
        stale['selected'][0]['fixture_sha256'] = '0' * 64
        result = validate_batch(stale, self.bank, self.fixtures, self.catalog, self.profiles)
        self.assertFalse(result['batch_valid'])
        self.assertIn('fixture_sha256_mismatch:C12', result['errors'])
        running = copy.deepcopy(self.batch)
        running['execution'] = 'running'
        result = validate_batch(running, self.bank, self.fixtures, self.catalog, self.profiles)
        self.assertFalse(result['batch_valid'])
        self.assertIn('execution_must_be_not_performed', result['errors'])

    def test_profile_gap_is_visible_before_any_future_run(self):
        gap = copy.deepcopy(self.batch)
        gap['selected'][0]['profile'] = 'memory'
        result = validate_batch(gap, self.bank, self.fixtures, self.catalog, self.profiles)
        self.assertFalse(result['batch_valid'])
        self.assertIn('profile_namespace_gap:C12:files,shell', result['errors'])

    def test_default_loader_never_executes(self):
        result = load_and_validate()
        self.assertTrue(result['batch_valid'])
        self.assertEqual(result['execution'], 'not_performed')
        self.assertFalse(result['writes_performed'])

if __name__ == '__main__':
    unittest.main()
