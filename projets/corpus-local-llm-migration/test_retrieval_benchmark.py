import copy,json,unittest
from pathlib import Path
from retrieval_benchmark import run,validate
HERE=Path(__file__).parent
class RetrievalBenchmarkTests(unittest.TestCase):
 def setUp(self):self.matrix=json.loads((HERE/'RETRIEVAL_BENCHMARKS.json').read_text())
 def test_frozen_adversarial_matrix_passes_without_index_or_content(self):
  r=run(self.matrix);self.assertEqual(r['result'],'pass');self.assertFalse(r['writes_performed']);self.assertFalse(r['content_stored']);self.assertEqual(len(r['cases']),5)
 def test_evaluator_drift_blocks_matrix(self):
  m=copy.deepcopy(self.matrix);m['evaluator_sha256']='0'*64
  with self.assertRaises(ValueError):validate(m)
 def test_wrong_expected_outcome_is_visible(self):
  m=copy.deepcopy(self.matrix);m['cases'][0]['expected']='fail'
  self.assertEqual(run(m)['result'],'fail')
if __name__=='__main__':unittest.main()
