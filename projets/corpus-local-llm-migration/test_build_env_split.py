from pathlib import Path
import unittest
import corpus_paths

HERE=Path(__file__).resolve().parent

class BuildEnvSplitTests(unittest.TestCase):
    def test_contract_separates_browser_and_build_tools(self):
        self.assertNotEqual(corpus_paths.LOCAL_BROWSER_ENV_ROOT, corpus_paths.LOCAL_BUILD_TOOLS_ROOT)
        self.assertEqual(corpus_paths.LOCAL_BROWSER_ENV_ROOT, corpus_paths.LOCAL_RUNTIME_ROOT/'browser-env')
        self.assertEqual(corpus_paths.LOCAL_BUILD_TOOLS_ROOT, corpus_paths.TOOLCHAINS_ROOT/'envs/corpus-local-build-tools')
        self.assertEqual(corpus_paths.LOCAL_BUILD_WHEELHOUSE_ROOT, corpus_paths.TOOLCHAINS_ROOT/'wheelhouse/corpus-local-build-tools')

    def test_consumers_use_split_contract(self):
        gateway=(HERE/'tool_gateway.py').read_text()
        rebuild=(HERE/'rebuild_runtime.py').read_text()
        hermes=(HERE/'restore_hermes.py').read_text()
        self.assertIn('LOCAL_BROWSER_ENV_ROOT',gateway)
        self.assertIn('LOCAL_BUILD_TOOLS_ROOT',rebuild)
        self.assertIn('LOCAL_BUILD_TOOLS_ROOT',hermes)
        self.assertNotIn('build-env/bin/', gateway+rebuild+hermes)

if __name__=='__main__': unittest.main()
