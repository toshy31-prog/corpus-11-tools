import json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import model_residency as r

class ResidencyTests(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory(); self.root=Path(self.t.name)
  self.hot=self.root/"hot"; self.cold=self.root/"vault"/"ColdModels/media"; self.hot.mkdir(); self.cold.mkdir(parents=True)
  self.data=b"model-bytes"
  import hashlib
  self.entry={"file":"m.bin","size":len(self.data),"sha256":hashlib.sha256(self.data).hexdigest()}
 def tearDown(self): self.t.cleanup()
 def patches(self):
  return patch.multiple(r,MEDIA_MODELS_ROOT=self.hot,VAULT_ROOT=self.root/"vault",MIN_FREE_AFTER=0,locks=lambda:{"m.bin":self.entry})
 def test_cold_is_available_without_copy(self):
  (self.cold/"m.bin").write_bytes(self.data)
  with self.patches():
   self.assertEqual(r.residency(["m.bin"]),"cold")
   self.assertFalse((self.hot/"m.bin").exists())
 def test_promotes_and_verifies(self):
  (self.cold/"m.bin").write_bytes(self.data)
  with self.patches():
   self.assertEqual(r.ensure_hot(["m.bin"]),"hot")
   self.assertEqual((self.hot/"m.bin").read_bytes(),self.data)
 def test_invalid_cold_fails_closed(self):
  (self.cold/"m.bin").write_bytes(b"bad")
  with self.patches():
   with self.assertRaises(ValueError): r.ensure_hot(["m.bin"])
   self.assertFalse((self.hot/"m.bin").exists())
 def test_missing_vault_is_unavailable(self):
  with self.patches(): self.assertEqual(r.residency(["m.bin"]),"unavailable")
 def test_demote_verifies_before_removing_hot(self):
  (self.hot/"m.bin").write_bytes(self.data)
  with self.patches():
   self.assertEqual(r.demote(["m.bin"]),"cold")
   self.assertFalse((self.hot/"m.bin").exists())
   self.assertEqual((self.cold/"m.bin").read_bytes(),self.data)
 def test_demote_invalid_hot_does_not_create_cold(self):
  (self.hot/"m.bin").write_bytes(b"bad")
  with self.patches():
   with self.assertRaises(ValueError): r.demote(["m.bin"])
   self.assertTrue((self.hot/"m.bin").exists())
   self.assertFalse((self.cold/"m.bin").exists())

if __name__=="__main__": unittest.main()
