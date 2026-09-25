from pathlib import Path
import unittest
import corpus_local

HERE=Path(__file__).resolve().parent

class RuntimePromotionTests(unittest.TestCase):
    def test_local_profiles_are_runtime_versions_not_build_outputs(self):
        self.assertIn('/versions/llama-b10964-cpu-local/', str(corpus_local.LLAMA_CPU_LOCAL))
        self.assertIn('/versions/llama-b10964-cuda-local/', str(corpus_local.LLAMA_CUDA))
        self.assertNotIn('/build/', str(corpus_local.LLAMA_CPU_LOCAL))
        self.assertNotIn('/build/', str(corpus_local.LLAMA_CUDA))

    def test_rebuild_target_is_canonical_build_cache_and_origin_rpath(self):
        source=(HERE/'rebuild_runtime.py').read_text()
        self.assertIn('LOCAL_BUILD_CACHE_ROOT',source)
        self.assertIn('LOCAL_BUILD_CACHE_ROOT / "llama-cpu"',source)
        self.assertIn('CMAKE_BUILD_RPATH_USE_ORIGIN=ON',source)
        self.assertIn('CMAKE_INSTALL_RPATH=$ORIGIN',source)

    def test_updater_no_longer_reports_build_tree_as_runtime_component(self):
        source=(HERE/'update_manager.py').read_text()
        self.assertNotIn("corpus-local/build/llama-cpu/bin/llama-server",source)
        self.assertIn('llama-b10964-cuda-local/bin/llama-server',source)

if __name__=='__main__': unittest.main()
