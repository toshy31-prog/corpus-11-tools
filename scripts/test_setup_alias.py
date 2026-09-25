"""Exercise only alias generation, never the workstation provisioning script."""
from pathlib import Path
import subprocess
import tempfile
import unittest


class SetupAliasTests(unittest.TestCase):
    def test_generated_alias_preserves_literal_workspace_path(self):
        source = Path(__file__).with_name("setup-corpus-ubuntu.sh").read_text()
        lines = [line for line in source.splitlines() if line.startswith("printf 'alias corpus=")]
        self.assertEqual(len(lines), 1)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ("Corpus", "Corpus avec espaces", "Corpus d'Olivier", 'Corpus;false', 'Corpus $(false) `false` "quoted"'):
                with self.subTest(name=name):
                    workspace = root / name
                    workspace.mkdir()
                    shell = '\n'.join([
                        'set -e', 'workspace_dir="$1"', 'tmp_rc="$2"',
                        lines[0], 'shopt -s expand_aliases', 'source "$tmp_rc"',
                        'eval corpus', 'pwd -P',
                    ])
                    result = subprocess.run(
                        ["bash", "--noprofile", "--norc", "-c", shell, "alias-test",
                         str(workspace), str(root / "aliases")],
                        capture_output=True, text=True, cwd=root, check=False,
                    )
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertEqual(result.stdout.strip(), str(workspace.resolve()))


if __name__ == "__main__":
    unittest.main()
