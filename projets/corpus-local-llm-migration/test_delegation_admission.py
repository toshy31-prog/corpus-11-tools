import json
import unittest
from pathlib import Path

from delegation_admission import AdmissionError, admit

HERE = Path(__file__).resolve().parent
CATALOG = json.loads((HERE / 'tool_router_catalog_v2.json').read_text())


def budget(**overrides):
    value = {
        'max_tasks': 3, 'max_parallel': 3, 'max_total_seconds': 120,
        'max_tool_calls': 8, 'max_risk': 'medium',
        'parent_exposed_tools': ['read', 'grep', 'edit'],
    }
    value.update(overrides)
    return value


def task(ident='inspect', **overrides):
    value = {
        'id': ident, 'estimated_seconds': 20, 'max_tool_calls': 2,
        'requested_tools': ['read'], 'risk': 'low', 'requires_confirmation': False,
    }
    value.update(overrides)
    return value


class DelegationAdmissionTests(unittest.TestCase):
    def test_eligible_plan_is_non_executing_and_preserves_parent_boundary(self):
        result = admit([task('inspect'), task('search', requested_tools=['grep'])], budget(), catalog=CATALOG)
        self.assertEqual(result['admission'], 'eligible')
        self.assertEqual(result['execution'], 'not_started')
        self.assertEqual(result['totals']['estimated_seconds'], 40)
        self.assertEqual(result['requested'][0]['requested_tools'], ['read'])

    def test_unavailable_or_unknown_tools_do_not_expand_scope(self):
        with self.assertRaisesRegex(AdmissionError, 'périmètre parent'):
            admit([task(requested_tools=['bash'], risk='high', requires_confirmation=True)], budget(), catalog=CATALOG)
        with self.assertRaisesRegex(AdmissionError, 'inconnu'):
            admit([task(requested_tools=['invented'])], budget(), catalog=CATALOG)

    def test_medium_risk_requires_confirmation_and_budget_risk_is_enforced(self):
        with self.assertRaisesRegex(AdmissionError, 'Confirmation'):
            admit([task(requested_tools=['edit'], risk='medium')], budget(), catalog=CATALOG)
        rejected = admit([task(requested_tools=['edit'], risk='medium', requires_confirmation=True,
                               exclusive_resources=['fixture.py'])], budget(max_risk='low'), catalog=CATALOG)
        self.assertEqual(rejected['admission'], 'rejected')
        self.assertIn('risque maximal', rejected['violations'][0])

    def test_aggregate_time_tools_and_count_are_rejected_without_partial_launch(self):
        result = admit([task('a', estimated_seconds=70, max_tool_calls=4), task('b', estimated_seconds=70, max_tool_calls=5), task('c'), task('d')], budget(), catalog=CATALOG)
        self.assertEqual(result['admission'], 'rejected')
        self.assertEqual(result['execution'], 'not_started')
        self.assertEqual(len(result['requested']), 4)
        self.assertEqual(set(result['violations']), {
            'nombre maximal de délégations dépassé',
            'budget de temps déclaré dépassé',
            'budget d’appels d’outils déclaré dépassé',
        })

    def test_parallelism_needs_declaration_and_respects_its_budget(self):
        rows = [task('a', parallel_safe=True, parallel_rationale='independent_read_only_analysis'),
                task('b', parallel_safe=True, parallel_rationale='independent_read_only_analysis')]
        rejected = admit(rows, budget(max_parallel=1), catalog=CATALOG)
        self.assertEqual(rejected['admission'], 'rejected')
        self.assertIn('budget de parallélisme déclaré dépassé', rejected['violations'])
        self.assertTrue(rejected['waves'][0]['parallel'])

    def test_risk_cannot_be_under_declared(self):
        with self.assertRaisesRegex(AdmissionError, 'sous-déclaré'):
            admit([task(requested_tools=['edit'], risk='low', requires_confirmation=True,
                        exclusive_resources=['fixture.py'])], budget(), catalog=CATALOG)

    def test_parallel_work_needs_a_specific_rationale_and_writes_reserve_a_resource(self):
        with self.assertRaisesRegex(AdmissionError, 'Justification de parallélisme'):
            admit([task(parallel_safe=True)], budget(), catalog=CATALOG)
        with self.assertRaisesRegex(AdmissionError, 'Ressource exclusive'):
            admit([task(requested_tools=['edit'], risk='medium', requires_confirmation=True)], budget(), catalog=CATALOG)

    def test_plan_exposes_recheckable_preconditions_and_wall_upper_bound(self):
        rows = [task('read', estimated_seconds=20, parallel_safe=True,
                     parallel_rationale='independent_read_only_analysis'),
                task('inspect', estimated_seconds=30, parallel_safe=True,
                     parallel_rationale='independent_read_only_analysis')]
        result = admit(rows, budget(), catalog=CATALOG)
        self.assertEqual(result['totals']['estimated_wall_seconds_upper_bound'], 30)
        self.assertEqual(result['execution_preconditions']['status'], 'required_not_observed')
        self.assertIn('catalog_contract_reverified', result['execution_preconditions']['before_any_execution'])


if __name__ == '__main__':
    unittest.main()
