from __future__ import annotations

import unittest
import io
from contextlib import redirect_stdout
from pathlib import Path
import subprocess
import tempfile
from unittest.mock import patch

import maintenance_digest


class MaintenanceDigestTests(unittest.TestCase):
    def test_output_inside_and_outside_repository(self) -> None:
        data = {"generated_at": "2026-09-19", "branch": "main", **{
            key: [] for key in ("git_status", "skills", "plugin_manifests", "transfer_candidates",
                               "archives", "untracked", "ignored_artifacts")}}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "repository"
            root.mkdir()
            for argument in ["reports/digest.md", str(Path(directory) / "outside" / "digest.md")]:
                with self.subTest(output=argument):
                    stdout = io.StringIO()
                    with patch.object(maintenance_digest, "ROOT", root), \
                         patch.object(maintenance_digest, "collect", return_value=data), \
                         patch("sys.argv", ["maintenance_digest.py", "--output", argument]), \
                         redirect_stdout(stdout):
                        self.assertEqual(maintenance_digest.main(), 0)
                    output = Path(argument) if Path(argument).is_absolute() else root / argument
                    self.assertEqual(output.read_text(), maintenance_digest.render(data))
                    self.assertEqual(stdout.getvalue().strip(), argument)

    def test_collect_on_branch_and_detached_commit(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def git(*args: str) -> str:
                return subprocess.check_output(["git", *args], cwd=root, stderr=subprocess.PIPE, text=True).strip()
            git("init", "-b", "maintenance-test")
            git("-c", "user.name=Local test", "-c", "user.email=test@example.invalid",
                "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null",
                "commit", "--allow-empty", "-m", "test: initialize fixture")
            with patch.object(maintenance_digest, "ROOT", root):
                self.assertEqual(maintenance_digest.collect()["branch"], "maintenance-test")
                commit = git("rev-parse", "--short", "HEAD")
                git("checkout", "--detach", "HEAD")
                data = maintenance_digest.collect()
                self.assertEqual(data["branch"], f"HEAD détachée ({commit})")
                self.assertIn(f"HEAD détachée ({commit})", maintenance_digest.render(data))
                self.assertEqual(git("status", "--porcelain"), "")

    def test_completed_research_is_visible_without_classifying_active_projects(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archived = "research/archive/old/ARCHIVE.md"
            completed = "research/completed/closed/README.md"
            for name in [archived, completed, "research/active/open/README.md",
                         "research/completed/closed/archives/README.md"]:
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("# Fixture\n", encoding="utf-8")
            with patch.object(maintenance_digest, "ROOT", root), \
                 patch.object(maintenance_digest, "git_lines", return_value=["test"]):
                data = maintenance_digest.collect()
            self.assertEqual(data["archives"], [archived, completed])
            rendered = maintenance_digest.render(data)
            self.assertIn("Recherches archivées ou terminées", rendered)
            self.assertIn(f"`{completed}`", rendered)
            self.assertNotIn("research/active/open", rendered)
            self.assertNotIn("closed/archives", rendered)

    def test_render_marks_the_digest_non_destructive(self) -> None:
        rendered = maintenance_digest.render(
            {
                "generated_at": "2026-09-05T00:00:00+00:00",
                "branch": "main",
                "git_status": [],
                "skills": ["tool/SKILL.md"],
                "plugin_manifests": [],
                "transfer_candidates": [],
                "archives": [],
                "untracked": [],
                "ignored_artifacts": [{"path": "research/runtime", "bytes": 3}],
            }
        )
        self.assertIn("aucune installation, suppression, archive ou publication automatique", rendered)
        self.assertIn("`tool/SKILL.md`", rendered)
        self.assertIn("`research/runtime` — 3 octets", rendered)

    def test_ignored_virtual_environments_are_not_maintenance_artifacts(self) -> None:
        self.assertNotIn(".venv", maintenance_digest.ARTIFACT_DIRS)


if __name__ == "__main__":
    unittest.main()
