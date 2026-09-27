import copy,json,unittest
from pathlib import Path
from model_routing_cases import run,validate
HERE=Path(__file__).parent
class ModelRoutingCaseTests(unittest.TestCase):
 def setUp(self):self.cases=json.loads((HERE/'MODEL_ROUTING_CASES.json').read_text())
 def test_frozen_cases_cover_budgets_modalities_tools_and_cold_profile_without_runtime(self):
  r=run(self.cases);self.assertEqual(r['result'],'pass');self.assertFalse(r['writes_performed']);self.assertTrue(all(x['checks']['runtime_unchanged'] for x in r['cases']));self.assertEqual(len(r['cases']),7)
 def test_registry_drift_blocks_case_run(self):
  c=copy.deepcopy(self.cases);c['registry_sha256']='0'*64
  with self.assertRaises(ValueError):validate(c)
 def test_expected_route_regression_is_visible(self):
  c=copy.deepcopy(self.cases);c['cases'][0]['expected']['selected_id']='wrong'
  self.assertEqual(run(c)['result'],'fail')
if __name__=='__main__':unittest.main()
