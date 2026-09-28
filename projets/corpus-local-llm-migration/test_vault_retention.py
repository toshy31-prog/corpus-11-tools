import tempfile,unittest
from pathlib import Path
import vault_retention as v

class VaultRetentionTests(unittest.TestCase):
 def test_duplicate_payloads_are_reported_not_deleted(self):
  with tempfile.TemporaryDirectory() as td:
   root=Path(td); a=root/"RecoverySnapshots/a"; b=root/"RecoverySnapshots/b"; a.mkdir(parents=True);b.mkdir()
   (a/"x.tar").write_bytes(b"same");(b/"y.tar").write_bytes(b"same")
   out=v.inventory(root)
   self.assertEqual(len(out["duplicates"]),1)
   self.assertTrue((a/"x.tar").exists());self.assertTrue((b/"y.tar").exists())
 def test_unconfigured_is_explicit(self):
  self.assertEqual(v.inventory(None if v.VAULT_ROOT is None else Path("/definitely/missing"))["duplicates"],[])
if __name__=="__main__":unittest.main()
