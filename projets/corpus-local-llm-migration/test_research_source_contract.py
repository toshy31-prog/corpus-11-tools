import copy,json,unittest
from pathlib import Path
from research_source_contract import validate
HERE=Path(__file__).parent
class SourceContractTests(unittest.TestCase):
 def setUp(self):self.r=json.loads((HERE/'RESEARCH_SOURCE_TEMPLATE.json').read_text())
 def test_primary_metadata_has_no_excerpt_or_network_collection(self):
  v=validate(self.r);self.assertTrue(v['valid']);self.assertFalse(v['excerpt_stored']);self.assertEqual(v['network'],'not_used')
 def test_community_label_is_preserved(self):
  r=copy.deepcopy(self.r);r['source_kind']='community';self.assertEqual(validate(r)['source_kind'],'community')
 def test_stored_excerpt_or_unknown_license_is_rejected(self):
  r=copy.deepcopy(self.r);r['excerpt']['stored']=True
  with self.assertRaises(ValueError):validate(r)
  r=copy.deepcopy(self.r);r['license_status']='free-ish'
  with self.assertRaises(ValueError):validate(r)
if __name__=='__main__':unittest.main()
