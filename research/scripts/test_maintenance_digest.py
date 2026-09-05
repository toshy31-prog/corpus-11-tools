from __future__ import annotations

import unittest

import maintenance_digest


class MaintenanceDigestTests(unittest.TestCase):
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
