from pathlib import Path
import unittest
import corpus_paths

HERE=Path(__file__).resolve().parent

class StorageTerritoryTests(unittest.TestCase):
    def test_rebuild_reads_sources_from_toolchains(self):
        source=(HERE/'rebuild_runtime.py').read_text()
        self.assertIn('TOOLCHAIN_SOURCES_ROOT',source)
        self.assertNotIn("BASE / 'sources/",source)

    def test_install_local_downloads_archives_to_cache(self):
        source=(HERE/'install_local.py').read_text()
        self.assertIn('DOWNLOAD_CACHE_ROOT',source)
        self.assertNotIn("downloads = DEST / 'downloads'",source)

    def test_hermes_uses_toolchain_source_and_uv_cache(self):
        source=(HERE/'restore_hermes.py').read_text()
        self.assertIn('TOOLCHAIN_SOURCES_ROOT',source)
        self.assertIn('UV_CACHE_ROOT',source)
        self.assertNotIn("base / 'sources/hermes",source)

    def test_hermes_deploys_from_runtime_checkout(self):
        source=(HERE/'restore_hermes.py').read_text()
        self.assertIn('LOCAL_APPS_ROOT',source)
        self.assertIn('runtime_source',source)
        self.assertIn('shutil.copytree',source)
        self.assertIn('TOOLCHAIN_SOURCES_ROOT',source)
        self.assertIn('--project',source)
        self.assertIn('str(runtime_source)',source)
        self.assertNotIn('--no-editable',source)

    def test_build_env_intentionally_stays_runtime_for_now(self):
        gateway=(HERE/'tool_gateway.py').read_text()
        self.assertIn("BASE/'build-env/bin/python'",gateway)

if __name__=='__main__': unittest.main()
