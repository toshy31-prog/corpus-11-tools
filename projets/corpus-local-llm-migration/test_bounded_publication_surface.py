from pathlib import Path
import subprocess
import tempfile
import unittest

import bounded_single_commit_publication as git1
import bounded_publication_surface as surf


def run(repo: Path, *args: str, check=True):
    p = subprocess.run(
        ["git", "-C", str(repo), *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if check and p.returncode:
        raise RuntimeError(p.stderr or p.stdout)
    return p.stdout.strip()


class BoundedPublicationSurfaceTests(unittest.TestCase):
    def fixture(self):
        td = tempfile.TemporaryDirectory()
        repo = Path(td.name) / "repo"
        repo.mkdir()
        run(repo, "init", "-b", "main")
        run(repo, "config", "user.email", "fixture@example.invalid")
        run(repo, "config", "user.name", "Fixture")
        (repo / "app.txt").write_bytes(b"base\n")
        (repo / "foreign.txt").write_bytes(b"foreign-base\n")
        run(repo, "add", "app.txt", "foreign.txt")
        run(repo, "commit", "-m", "base")
        base = run(repo, "rev-parse", "HEAD")
        run(repo, "branch", "publish", base)
        return td, repo, base

    def selection(self, content=b"base\nauthorized\n"):
        return [git1.FileSelection(path="app.txt", mode="100644", content=content)]

    def test_prepare_then_publish_preserves_dirty_foreign_and_exact_tree(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "foreign.txt").write_bytes(b"foreign-base\nX-local\n")
            foreign_before = (repo / "foreign.txt").read_bytes()

            def validator(root):
                self.assertEqual((root / "app.txt").read_bytes(), b"base\nauthorized\n")
                self.assertEqual((root / "foreign.txt").read_bytes(), b"foreign-base\n")
                self.assertFalse((root / ".git").exists())
                return {"status": "PASS"}

            prepared = surf.prepare_bounded_publication(
                repo,
                source_branch="main",
                expected_base=base,
                selections=self.selection(),
                validator=validator,
                message="candidate",
            )
            self.assertEqual(prepared.validation.candidate_tree, prepared.candidate.tree)
            self.assertEqual(prepared.commit.tree, prepared.candidate.tree)
            self.assertEqual(prepared.commit.parent, base)
            self.assertEqual(run(repo, "rev-parse", "HEAD"), base)

            receipt = surf.publish_prepared(
                prepared,
                destination_branch="publish",
                expected_old=base,
            )
            self.assertEqual(receipt.new, prepared.commit.commit)
            self.assertEqual(run(repo, "rev-parse", "publish"), prepared.commit.commit)
            self.assertEqual(run(repo, "rev-parse", "main"), base)
            self.assertEqual((repo / "foreign.txt").read_bytes(), foreign_before)
            self.assertEqual(run(repo, "diff", "--cached", "--name-only"), "")

    def test_validation_failure_never_creates_prepared_publication(self):
        td, repo, base = self.fixture()
        with td:
            with self.assertRaisesRegex(git1.PublicationRefusal, "validator returned false"):
                surf.prepare_bounded_publication(
                    repo,
                    source_branch="main",
                    expected_base=base,
                    selections=self.selection(),
                    validator=lambda root: False,
                    message="candidate",
                )
            self.assertEqual(run(repo, "rev-parse", "main"), base)
            self.assertEqual(run(repo, "rev-parse", "publish"), base)

    def test_checked_out_destination_refusal_is_preserved(self):
        td, repo, base = self.fixture()
        with td:
            prepared = surf.prepare_bounded_publication(
                repo,
                source_branch="main",
                expected_base=base,
                selections=self.selection(),
                validator=lambda root: True,
                message="candidate",
            )
            with self.assertRaisesRegex(
                git1.PublicationRefusal,
                "checked-out branch",
            ):
                surf.publish_prepared(
                    prepared,
                    destination_branch="main",
                    expected_old=base,
                )
            self.assertEqual(run(repo, "rev-parse", "main"), base)

    def test_human_staging_refusal_is_preserved(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "foreign.txt").write_bytes(b"staged-human\n")
            run(repo, "add", "foreign.txt")
            with self.assertRaisesRegex(git1.PublicationRefusal, "human index"):
                surf.prepare_bounded_publication(
                    repo,
                    source_branch="main",
                    expected_base=base,
                    selections=self.selection(),
                    validator=lambda root: True,
                    message="candidate",
                )
            self.assertIn("foreign.txt", run(repo, "diff", "--cached", "--name-only"))

    def test_forged_mismatched_prepared_receipt_is_refused(self):
        td, repo, base = self.fixture()
        with td:
            prepared = surf.prepare_bounded_publication(
                repo,
                source_branch="main",
                expected_base=base,
                selections=self.selection(),
                validator=lambda root: True,
                message="candidate",
            )
            bad_validation = git1.ValidationReceipt(
                candidate_tree="0" * 40,
                manifest_digest=prepared.validation.manifest_digest,
                file_count=prepared.validation.file_count,
                materialization_contract=prepared.validation.materialization_contract,
                validator_result=True,
            )
            forged = surf.PreparedPublication(
                candidate=prepared.candidate,
                validation=bad_validation,
                commit=prepared.commit,
            )
            with self.assertRaisesRegex(git1.PublicationRefusal, "validation"):
                surf.publish_prepared(
                    forged,
                    destination_branch="publish",
                    expected_old=base,
                )
            self.assertEqual(run(repo, "rev-parse", "publish"), base)

    def test_surface_has_no_remote_push_api(self):
        self.assertFalse(hasattr(surf, "push"))
        self.assertFalse(hasattr(surf, "publish_remote"))
        self.assertFalse(hasattr(surf, "publish_everything"))


if __name__ == "__main__":
    unittest.main()
