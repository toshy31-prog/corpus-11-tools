import copy,json,unittest
from pathlib import Path
from memory_benchmark import run,validate_matrix
HERE=Path(__file__).parent
class MemoryBenchmarkTests(unittest.TestCase):
 def setUp(self):self.matrix=json.loads((HERE/'MEMORY_BENCHMARKS.json').read_text());self.fixtures=json.loads((HERE/'SCENARIO_FIXTURES.json').read_text())
 def test_frozen_matrix_runs_contract_regressions_without_content(self):
  v=run(self.matrix,self.fixtures);self.assertEqual(v['result'],'pass');self.assertFalse(v['writes_performed']);self.assertFalse(v['content_stored']);self.assertEqual(len(v['cases']),4)
 def test_fixture_drift_is_rejected(self):
  m=copy.deepcopy(self.matrix);m['cases'][0]['fixture_sha256']='0'*64
  with self.assertRaises(ValueError):validate_matrix(m,self.fixtures)
 def test_unexpected_contract_result_fails_case(self):
  m=copy.deepcopy(self.matrix);m['cases'][0]['expected']['pass']=False
  with self.assertRaises(ValueError):run(m,self.fixtures)
if __name__=='__main__':unittest.main()
