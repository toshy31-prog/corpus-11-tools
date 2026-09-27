import copy,json,unittest
from pathlib import Path
from resume_summary_contract import validate
HERE=Path(__file__).parent
class ResumeSummaryContractTests(unittest.TestCase):
 def setUp(self):self.summary=json.loads((HERE/'RESUME_SUMMARY_TEMPLATE.json').read_text())
 def test_separates_epistemic_buckets_without_memory_injection(self):
  r=validate(self.summary);self.assertTrue(r['valid']);self.assertFalse(r['memory_injection']);self.assertFalse(r['writes_performed']);self.assertEqual(r['summary_counts']['facts'],1)
 def test_fact_or_hypothesis_without_evidence_is_rejected(self):
  s=copy.deepcopy(self.summary);s['facts'][0]['evidence_ids']=['missing']
  with self.assertRaises(ValueError):validate(s)
 def test_note_content_or_unlabeled_bucket_is_rejected(self):
  s=copy.deepcopy(self.summary);s['memory_refs'][0]['content']='secret'
  with self.assertRaises(ValueError):validate(s)
if __name__=='__main__':unittest.main()
