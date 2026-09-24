import unittest,tempfile,json
from pathlib import Path
from unittest.mock import patch
import document_generation as d
class Documents(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.old=d.BASE;d.BASE=Path(self.tmp.name)
 def tearDown(self):d.BASE=self.old;self.tmp.cleanup()
 def test_reject_paths_and_formats(self):
  for v in ['../../etc/passwd','0'*31]:
   with self.assertRaises(ValueError):d.folder(v)
  with self.assertRaises(ValueError):d.operate({'action':'create','format':'exe','content':'x'})
 def test_reject_bad_cells(self):
  for rows in [[['a',float('nan')]],[[{}]],[]]:
   with self.assertRaises(ValueError):d.operate({'action':'create','format':'ods','rows':rows})
 def test_asset_only_completed(self):
  j={'id':'a'*32,'state':'queued','format':'txt'};d.save(j);(d.folder(j['id'])/'document.txt').write_text('hello')
  url='/corpus/documents/'+j['id']+'/document.txt'
  self.assertIn(b'404',d.asset(url));j['state']='completed';d.save(j);self.assertIn(b'200 OK',d.asset(url));self.assertIn(b'404',d.asset(url.replace('txt','html')))
 def test_recovery(self):
  j={'id':'a'*32,'state':'running'};d.save(j);d.recover();self.assertEqual(d.read(j['id'])['state'],'failed')
 def test_csv_formula_is_literal(self):
  j={'id':'a'*32,'state':'queued','format':'csv','rows':[['=1+1',3]],'content':''};d.save(j);d.execute(j)
  self.assertEqual((d.folder(j['id'])/'document.csv').read_text(),"'=1+1,3\n")
