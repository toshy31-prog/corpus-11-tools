import unittest
import corpus_cache_clean as c

class CacheCleanTests(unittest.TestCase):
    def test_allowlist_is_narrow(self):
        self.assertEqual(set(c.TARGETS),{"download_cache","huggingface_cache","corpus_3d_target"})
    def test_never_targets_primary_state_models_or_runtime(self):
        for p in c.TARGETS.values():
            s=str(p)
            self.assertNotIn("/.local/state/corpus",s)
            self.assertNotIn("/.local/share/corpus/models",s)
            self.assertNotIn("/.local/share/corpus/runtime",s)
            self.assertNotIn("/CorpusVault",s)
    def test_unknown_target_fails_closed(self):
        with self.assertRaises(ValueError):
            c.clean(["surprise"])
if __name__=="__main__": unittest.main()
