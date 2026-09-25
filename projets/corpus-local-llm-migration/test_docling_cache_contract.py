import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import bootstrap_docling as b

class DoclingCacheContractTests(unittest.TestCase):
    def test_materialize_snapshot_resolves_cache_symlinks_to_independent_names(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); blob=root/'cache/blob'; blob.parent.mkdir(); blob.write_bytes(b'weights')
            snap=root/'snapshot'; (snap/'nested').mkdir(parents=True)
            (snap/'nested/model.bin').symlink_to(blob)
            dest=root/'models'
            b.materialize_snapshot(snap,dest)
            out=dest/'nested/model.bin'
            self.assertTrue(out.is_file())
            self.assertFalse(out.is_symlink())
            self.assertTrue(os.path.samefile(blob,out))
            (snap/'nested/model.bin').unlink(); blob.unlink()
            self.assertEqual(out.read_bytes(),b'weights')

    def test_hf_environment_uses_cache_contract(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            with patch.object(b,'HUGGINGFACE_CACHE_ROOT',root/'hf'), patch.object(b,'HUGGINGFACE_HUB_CACHE_ROOT',root/'hf/hub'):
                env=b.hf_environment()
            self.assertEqual(env['HF_HOME'],str(root/'hf'))
            self.assertEqual(env['HF_HUB_CACHE'],str(root/'hf/hub'))
            self.assertIn('CORPUS_MODELS_ROOT',env)

    def test_mcp_docling_no_longer_points_hf_cache_into_runtime(self):
        source=(Path(__file__).with_name('local_tools_mcp.py')).read_text()
        self.assertIn('HUGGINGFACE_CACHE_ROOT',source)
        self.assertIn('HUGGINGFACE_HUB_CACHE_ROOT',source)
        self.assertNotIn("CAP/'huggingface'",source)
        self.assertNotIn("CAP/'huggingface/hub'",source)

if __name__=='__main__': unittest.main()
