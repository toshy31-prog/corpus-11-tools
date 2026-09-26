from pathlib import Path
import unittest
import corpus_local
import corpus_paths

HERE=Path(__file__).resolve().parent

class OpenCodeProfileBoundaryTests(unittest.TestCase):
    def test_environment_matches_lifecycle_contract(self):
        env=corpus_local.environment()
        self.assertEqual(Path(env['HOME']),corpus_paths.OPENCODE_PROFILE_HOME)
        self.assertEqual(Path(env['XDG_CONFIG_HOME']),corpus_paths.OPENCODE_CONFIG_HOME)
        self.assertEqual(Path(env['XDG_DATA_HOME']),corpus_paths.OPENCODE_DATA_HOME)
        self.assertEqual(Path(env['XDG_STATE_HOME']),corpus_paths.OPENCODE_STATE_HOME)
        self.assertEqual(Path(env['XDG_CACHE_HOME']),corpus_paths.OPENCODE_CACHE_HOME)

    def test_runtime_no_longer_owns_profile_domains(self):
        source=(HERE/'corpus_local.py').read_text()
        for legacy in ("BASE / 'home'","BASE / 'config'","BASE / 'cache'","BASE / 'state'"):
            self.assertNotIn(legacy,source)
        self.assertIn('for root in (CONFIG_ROOT, STATE_ROOT, CACHE_ROOT)',source)

if __name__=='__main__': unittest.main()
