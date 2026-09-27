import unittest
from orchestration_plan import PlanError, build_waves


class OrchestrationPlanTests(unittest.TestCase):
    def test_independent_safe_tasks_share_a_wave(self):
        plan=build_waves([
            {'id':'memory','parallel_safe':True,'exclusive_resources':['memory']},
            {'id':'tools','parallel_safe':True,'exclusive_resources':['tools']},
            {'id':'trace','parallel_safe':True,'exclusive_resources':['trace']},
        ])
        self.assertEqual(plan['execution'],'not_started')
        self.assertEqual(plan['waves'][0]['tasks'],['memory','tools','trace'])
        self.assertTrue(plan['waves'][0]['parallel'])

    def test_dependency_and_unknown_parallelism_remain_sequential(self):
        plan=build_waves([
            {'id':'inspect','parallel_safe':False},
            {'id':'apply','depends_on':['inspect'],'parallel_safe':True},
            {'id':'other','parallel_safe':True},
        ])
        self.assertEqual([wave['tasks'] for wave in plan['waves']], [['inspect'],['apply','other']])

    def test_shared_exclusive_resource_is_not_parallelized(self):
        plan=build_waves([
            {'id':'a','parallel_safe':True,'exclusive_resources':['portal/app.js']},
            {'id':'b','parallel_safe':True,'exclusive_resources':['portal/app.js']},
        ])
        self.assertEqual([wave['tasks'] for wave in plan['waves']], [['a'],['b']])

    def test_rejects_unknown_and_cyclic_dependencies(self):
        with self.assertRaisesRegex(PlanError,'inconnue'):
            build_waves([{'id':'a','depends_on':['missing']}])
        with self.assertRaisesRegex(PlanError,'circulaires'):
            build_waves([{'id':'a','depends_on':['b']},{'id':'b','depends_on':['a']}])


if __name__ == '__main__':
    unittest.main()
