from pathlib import Path
import unittest
import corpus_paths
import corpus_local

HERE=Path(__file__).resolve().parent

class OpenCodePrimaryDataTests(unittest.TestCase):
    def test_environment_uses_primary_data_root(self):
        env=corpus_local.environment()
        self.assertEqual(env['XDG_DATA_HOME'],str(corpus_paths.OPENCODE_DATA_HOME))
        self.assertNotEqual(env['XDG_DATA_HOME'],str(corpus_paths.LOCAL_RUNTIME_ROOT/'data'))

    def test_other_profile_domains_not_moved_by_this_phase(self):
        env=corpus_local.environment()
        self.assertEqual(env['HOME'],str(corpus_paths.LOCAL_RUNTIME_ROOT/'home'))
        self.assertEqual(env['XDG_CONFIG_HOME'],str(corpus_paths.LOCAL_RUNTIME_ROOT/'config'))
        self.assertEqual(env['XDG_CACHE_HOME'],str(corpus_paths.LOCAL_RUNTIME_ROOT/'cache'))
        self.assertEqual(env['XDG_STATE_HOME'],str(corpus_paths.LOCAL_RUNTIME_ROOT/'state'))

if __name__=='__main__': unittest.main()
