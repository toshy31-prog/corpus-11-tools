import os
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "tools/corpus-gpt/corpus-gpt-source-watch-install"
SOURCE_DIR = REPO / "projets/corpus-local-llm-migration"


class SourceWatchInstallerTests(unittest.TestCase):
    def test_installer_uses_canonical_fragments_without_local_path_contract(self):
        text = SCRIPT.read_text()
        self.assertIn("corpus-gpt-source-watch.path", text)
        self.assertIn("corpus-gpt-source-reload.service", text)
        self.assertNotIn("PathChanged=", text)
        self.assertNotIn("<<", text)

    def test_installation_copies_exact_fragments_and_only_calls_expected_systemctl(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            target = root / "systemd-user"
            log = root / "systemctl.log"
            fake = root / "systemctl"
            fake.write_text(
                "#!/usr/bin/env bash\n"
                "printf '%s\\n' \"$*\" >> \"$CORPUS_TEST_SYSTEMCTL_LOG\"\n"
            )
            fake.chmod(0o700)
            env = os.environ.copy()
            env.update({
                "CORPUS_REPO_ROOT": str(REPO),
                "CORPUS_SYSTEMD_USER_DIR": str(target),
                "CORPUS_SYSTEMCTL": str(fake),
                "CORPUS_TEST_SYSTEMCTL_LOG": str(log),
            })
            subprocess.run([str(SCRIPT)], check=True, env=env, capture_output=True, text=True)
            self.assertEqual(
                (target / "corpus-gpt-source-watch.path").read_bytes(),
                (SOURCE_DIR / "corpus-gpt-source-watch.path").read_bytes(),
            )
            self.assertEqual(
                (target / "corpus-gpt-source-reload.service").read_bytes(),
                (SOURCE_DIR / "corpus-gpt-source-reload.service").read_bytes(),
            )
            self.assertEqual(
                log.read_text().splitlines(),
                [
                    "--user daemon-reload",
                    "--user enable --now corpus-gpt-source-watch.path",
                ],
            )
            self.assertEqual(
                {p.name for p in target.iterdir()},
                {"corpus-gpt-source-watch.path", "corpus-gpt-source-reload.service"},
            )


if __name__ == "__main__":
    unittest.main()
