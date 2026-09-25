"""Test the launcher without loading or running real analytical engines."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'src/run_lab.py'

class RunLabCliTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.project = Path(self.tmp.name) / 'repo/research/active/lab'
        self.script = self.project / 'src/run_lab.py'
        self.script.parent.mkdir(parents=True)
        shutil.copy2(SCRIPT, self.script)

    def invoke(self, *args):
        return subprocess.run([sys.executable, '-B', str(self.script), *args], capture_output=True, text=True, timeout=10)

    def test_help_without_engines_or_artifacts(self):
        result = self.invoke('--help')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('artefacts', result.stdout)
        self.assertFalse((self.project / 'artifacts').exists())

    def test_unknown_argument_without_engines_or_artifacts(self):
        result = self.invoke('--unknown-option')
        self.assertEqual(result.returncode, 2)
        self.assertIn('unrecognized arguments', result.stderr)
        self.assertFalse((self.project / 'artifacts').exists())

    def test_import_without_side_effects(self):
        result = subprocess.run([sys.executable, '-B', '-c', 'import runpy,sys; runpy.run_path(sys.argv[1])', str(self.script)], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.project / 'artifacts').exists())

    def test_default_preserves_pipeline_with_fake_engines(self):
        fixtures = {
            'kernel': ('build_snapshot', "{'fingerprint': 'fake'}"),
            'build_knowledge_graph': ('build_graph', "{'node_count': 0, 'edge_count': 0}"),
            'audit_dependencies': ('audit', '{}'),
            'evaluate': ('evaluate', "{'test_case_count': 0}"),
            'benchmark_v1': ('run', '{}'),
            'train_neural_router': ('train', '(type("FakeModel", (), {"to_dict": lambda self: {}})(), {})'),
        }
        for module, (function, value) in fixtures.items():
            (self.script.parent / (module + '.py')).write_text(
                f'from pathlib import Path\ndef {function}(root):\n'
                f'    with (Path(__file__).parents[1] / "calls.txt").open("a") as f: f.write("{module}\\n")\n'
                f'    return {value}\n')
        result = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.project / 'calls.txt').read_text().splitlines(), list(fixtures))
        self.assertEqual(len(list((self.project / 'artifacts').glob('*.json'))), 6)
        self.assertIn('fake', result.stdout)

if __name__ == '__main__':
    unittest.main()
