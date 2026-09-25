from pathlib import Path
import tempfile
import unittest
import corpus_paths

class CorpusPathContractTests(unittest.TestCase):
    def test_defaults_are_separated(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            paths = corpus_paths.resolve_contract(
                {"HOME": str(root / "home")},
                repo_root=root / "repo",
            )
            self.assertEqual(paths["runtime"], root / "home/.local/share/corpus/runtime")
            self.assertEqual(paths["data"], root / "home/.local/share/corpus/data")
            self.assertEqual(paths["state"], root / "home/.local/state/corpus")
            self.assertEqual(paths["cache"], root / "home/.cache/corpus")
            self.assertEqual(paths["config"], root / "home/.config/corpus")
            self.assertNotEqual(paths["runtime"], paths["state"])

    def test_runtime_and_state_overrides_are_independent(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            paths = corpus_paths.resolve_contract(
                {
                    "HOME": str(root / "home"),
                    "CORPUS_RUNTIME_ROOT": str(root / "hot"),
                    "CORPUS_STATE_ROOT": str(root / "state"),
                },
                repo_root=root / "repo",
            )
            self.assertEqual(paths["runtime"], root / "hot")
            self.assertEqual(paths["state"], root / "state")
            self.assertEqual(paths["local_runtime"], root / "hot/corpus-local")

    def test_state_no_longer_aliases_runtime(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            paths = corpus_paths.resolve_contract(
                {
                    "HOME": str(root / "home"),
                    "CORPUS_STATE_ROOT": str(root / "state-only"),
                },
                repo_root=root / "repo",
            )
            self.assertEqual(paths["runtime"], root / "home/.local/share/corpus/runtime")
            self.assertEqual(paths["state"], root / "state-only")

    def test_vault_has_no_hardcoded_default(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            paths = corpus_paths.resolve_contract(
                {"HOME": str(root / "home")},
                repo_root=root / "repo",
            )
            self.assertIsNone(paths["vault"])

    def test_relative_override_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            with self.assertRaises(RuntimeError):
                corpus_paths.resolve_contract(
                    {"HOME": str(root / "home"), "CORPUS_RUNTIME_ROOT": "relative/runtime"},
                    repo_root=root / "repo",
                )

    def test_models_and_toolchains_have_first_class_defaults(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            paths = corpus_paths.resolve_contract(
                {"HOME": str(root / "home")},
                repo_root=root / "repo",
            )
            self.assertEqual(paths["models"], root / "home/.local/share/corpus/models/hot")
            self.assertEqual(paths["toolchains"], root / "home/.local/share/corpus/toolchains")
            self.assertEqual(paths["build_cache"], root / "home/.cache/corpus/build")
            self.assertEqual(paths["maintenance_state"], root / "home/.local/state/corpus/maintenance")
            self.assertNotEqual(paths["models"], paths["runtime"])
            self.assertNotEqual(paths["toolchains"], paths["runtime"])

    def test_models_and_toolchains_overrides_are_independent(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            paths = corpus_paths.resolve_contract(
                {
                    "HOME": str(root / "home"),
                    "CORPUS_MODELS_ROOT": str(root / "models"),
                    "CORPUS_TOOLCHAINS_ROOT": str(root / "toolchains"),
                },
                repo_root=root / "repo",
            )
            self.assertEqual(paths["models"], root / "models")
            self.assertEqual(paths["toolchains"], root / "toolchains")

    def test_setup_uses_runtime_root(self):
        setup = (corpus_paths.REPO_ROOT / "scripts/setup-corpus-ubuntu.sh").read_text()
        self.assertIn("corpus_runtime_root=", setup)
        self.assertNotIn("corpus_state_root=", setup)
        self.assertIn('corpus_paths.py" runtime-root', setup)
        self.assertNotIn("CORPUS_STATE_ROOT", setup)

if __name__ == "__main__":
    unittest.main()
