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

    def test_profile_domains_use_canonical_lifecycle_roots(self):
        env=corpus_local.environment()
        self.assertEqual(env['HOME'],str(corpus_paths.OPENCODE_PROFILE_HOME))
        self.assertEqual(env['XDG_CONFIG_HOME'],str(corpus_paths.OPENCODE_CONFIG_HOME))
        self.assertEqual(env['XDG_CACHE_HOME'],str(corpus_paths.OPENCODE_CACHE_HOME))
        self.assertEqual(env['XDG_STATE_HOME'],str(corpus_paths.OPENCODE_STATE_HOME))
        for name in ('home','config','cache','state'):
            self.assertNotEqual(Path(env['HOME' if name=='home' else 'XDG_'+name.upper()+'_HOME']),corpus_paths.LOCAL_RUNTIME_ROOT/name)

if __name__=='__main__': unittest.main()
