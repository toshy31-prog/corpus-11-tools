import copy
import json
import unittest
from pathlib import Path

from representative_batch_schedule import load_and_validate, validate_schedule

HERE = Path(__file__).resolve().parent

class RepresentativeBatchScheduleTests(unittest.TestCase):
    def setUp(self):
        self.bank = json.loads((HERE / 'SCENARIOS.json').read_text(encoding='utf-8'))
        self.fixtures = json.loads((HERE / 'SCENARIO_FIXTURES.json').read_text(encoding='utf-8'))
        self.catalog = json.loads((HERE / 'tool_router_catalog_v2.json').read_text(encoding='utf-8'))
        self.profiles = json.loads((HERE / 'tool_profiles.json').read_text(encoding='utf-8'))
        self.batch = json.loads((HERE / 'REPRESENTATIVE_SCENARIO_BATCH.json').read_text(encoding='utf-8'))
        self.schedule = json.loads((HERE / 'REPRESENTATIVE_BATCH_SCHEDULE.json').read_text(encoding='utf-8'))

    def test_schedule_is_sequential_fail_closed_and_non_executing(self):
        value = validate_schedule(self.schedule, self.batch, self.bank, self.fixtures, self.catalog, self.profiles)
        self.assertTrue(value['schedule_valid'])
        self.assertEqual(value['execution'], 'not_started')
        self.assertFalse(value['writes_performed'])
        self.assertEqual([row['scenario_id'] for row in value['steps']], ['C14', 'C12', 'C05', 'C11'])
        self.assertEqual(value['admission']['execution'], 'not_started')
        self.assertEqual([wave['tasks'] for wave in value['admission']['waves']], [['C14'], ['C12'], ['C05'], ['C11']])
        self.assertEqual(value['admission']['budget']['max_parallel'], 1)

    def test_missing_or_failed_evidence_stop_condition_cannot_be_relaxed(self):
        bad = copy.deepcopy(self.schedule)
        bad['stop_conditions']['after_case_if'] = 'continue_anyway'
        value = validate_schedule(bad, self.batch, self.bank, self.fixtures, self.catalog, self.profiles)
        self.assertFalse(value['schedule_valid'])
        self.assertIn('stop_conditions_not_fail_closed', value['errors'])

    def test_controlled_error_must_be_a_successful_case_with_exact_fault_contract(self):
        bad = copy.deepcopy(self.schedule)
        bad['steps'][-1]['controlled_fault'] = None
        value = validate_schedule(bad, self.batch, self.bank, self.fixtures, self.catalog, self.profiles)
        self.assertFalse(value['schedule_valid'])
        self.assertIn('controlled_fault_contract_missing:C11', value['errors'])
        bad = copy.deepcopy(self.schedule)
        bad['steps'][-1]['expected_case_verdict'] = 'fail'
        value = validate_schedule(bad, self.batch, self.bank, self.fixtures, self.catalog, self.profiles)
        self.assertFalse(value['schedule_valid'])
        self.assertIn('expected_case_verdict_must_be_pass:C11', value['errors'])

    def test_budget_rejection_stays_non_executing(self):
        bad = copy.deepcopy(self.schedule)
        bad['budget']['max_tool_calls'] = 1
        value = validate_schedule(bad, self.batch, self.bank, self.fixtures, self.catalog, self.profiles)
        self.assertFalse(value['schedule_valid'])
        self.assertIn('delegation_admission_rejected', value['errors'])
        self.assertEqual(value['admission']['execution'], 'not_started')

    def test_loader_has_no_execution_path(self):
        value = load_and_validate()
        self.assertTrue(value['schedule_valid'])
        self.assertEqual(value['execution'], 'not_started')

if __name__ == '__main__':
    unittest.main()
