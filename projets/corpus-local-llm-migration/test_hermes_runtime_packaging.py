from pathlib import Path
import unittest

HERE=Path(__file__).resolve().parent

class HermesRuntimePackagingTests(unittest.TestCase):
    def test_upstream_supported_runtime_shape(self):
        source=(HERE/'restore_hermes.py').read_text()
        self.assertIn('LOCAL_APPS_ROOT',source)
        self.assertIn('TOOLCHAIN_SOURCES_ROOT',source)
        self.assertIn('runtime_source',source)
        self.assertIn('copytree',source)
        self.assertIn('--offline',source)
        self.assertIn('--frozen',source)
        self.assertNotIn('--no-editable',source)

if __name__=='__main__': unittest.main()
