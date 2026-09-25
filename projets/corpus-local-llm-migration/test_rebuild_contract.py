from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import rebuild_runtime as r

class RebuildContractTests(unittest.TestCase):
    def test_profiles_cover_cpu_and_cuda(self):
        self.assertEqual(set(r.PROFILES),{'cpu','cuda'})
        self.assertIn('-DGGML_CUDA=OFF',r.PROFILES['cpu']['cmake'])
        self.assertIn('-DGGML_CUDA=ON',r.PROFILES['cuda']['cmake'])

    def test_cached_source_parser_and_drift_reset(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); build=root/'build'; build.mkdir()
            (build/'CMakeCache.txt').write_text('CMAKE_HOME_DIRECTORY:INTERNAL=/old/source\n')
            self.assertEqual(r.cached_source(build),Path('/old/source'))
            with patch.object(r,'SOURCE',root/'new-source'):
                self.assertTrue(r.reset_if_source_drift(build))
            self.assertFalse(build.exists())

    def test_build_cache_and_runtime_are_separate_territories(self):
        for profile in r.PROFILES.values():
            self.assertIn('/.cache/corpus/build/',str(profile['build']))
            self.assertIn('/runtime/corpus-local/versions/',str(profile['runtime']))

    def test_source_is_canonical_toolchain_source(self):
        self.assertIn('/corpus/toolchains/sources/llama.cpp-b10964',str(r.SOURCE))

if __name__=='__main__': unittest.main()
