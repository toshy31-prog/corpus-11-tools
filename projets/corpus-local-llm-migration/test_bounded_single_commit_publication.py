import os
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest

from bounded_single_commit_publication import (
    FileSelection,
    PublicationRefusal,
    build_candidate,
    validate_candidate,
    create_commit,
    publish_ref,
)


class BoundedSingleCommitPublicationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.git("init", "-b", "main")
        self.git("config", "user.name", "GIT1 Fixture")
        self.git("config", "user.email", "git1@example.invalid")
        self.write("app.txt", b"base\n")
        self.write("foreign.txt", b"foreign-base\n")
        self.write("delete.txt", b"delete-me\n")
        self.write("tool.sh", b"#!/bin/sh\necho base\n", mode=0o644)
        self.git("add", "--", "app.txt", "foreign.txt", "delete.txt", "tool.sh")
        self.git("commit", "-m", "base")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.base_tree = self.git("rev-parse", "HEAD^{tree}").strip()
        self.git("branch", "publish", self.base)

    def tearDown(self):
        self.tmp.cleanup()

    def git(self, *args, input_bytes=None, check=True):
        cp = subprocess.run(
            ["git", "-C", str(self.repo), *args],
            input=input_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if check and cp.returncode:
            raise AssertionError(cp.stderr.decode() or cp.stdout.decode())
        return cp.stdout.decode("utf-8", "replace")

    def write(self, rel, data, mode=0o644):
        p = self.repo / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        p.chmod(mode)

    def index_bytes(self):
        p = Path(self.git("rev-parse", "--git-path", "index").strip())
        if not p.is_absolute():
            p = self.repo / p
        return p.read_bytes()

    def tree_bytes(self, treeish, path):
        return subprocess.run(
            ["git", "-C", str(self.repo), "show", f"{treeish}:{path}"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True
        ).stdout

    def candidate(self, selections):
        return build_candidate(
            self.repo,
            source_branch="main",
            expected_base=self.base,
            selections=selections,
        )

    def validate(self, candidate, callback=lambda root: {"ok": True}):
        return validate_candidate(candidate, callback)

    def commit(self, candidate, validation):
        return create_commit(candidate, validation, message="git1 fixture candidate")

    def publish(self, candidate, commit):
        return publish_ref(
            candidate,
            commit,
            destination_branch="publish",
            expected_old=self.base,
        )

    def test_T1_simple_publication_and_deterministic_tree(self):
        selection = [FileSelection("app.txt", "100644", b"candidate\n")]
        before_index = self.index_bytes()
        first = self.candidate(selection)
        second = self.candidate(selection)
        self.assertEqual(first.tree, second.tree)

        seen = {}
        def validator(root):
            seen["root_parent"] = root.parent
            seen["bytes"] = (root / "app.txt").read_bytes()
            seen["has_git"] = (root / ".git").exists()
            return {"validated": True}

        validation = self.validate(first, validator)
        commit = self.commit(first, validation)
        publication = self.publish(first, commit)

        self.assertEqual(seen["bytes"], b"candidate\n")
        self.assertEqual(seen["root_parent"], self.repo.parent)
        self.assertFalse(seen["has_git"])
        self.assertEqual(self.git("rev-parse", f"{commit.commit}^{{tree}}").strip(), first.tree)
        self.assertEqual(self.git("show", "-s", "--format=%P", commit.commit).strip(), self.base)
        self.assertEqual(self.git("rev-parse", "main").strip(), self.base)
        self.assertEqual(self.git("rev-parse", "publish").strip(), commit.commit)
        self.assertEqual(publication.human_index_tree, self.base_tree)
        self.assertEqual(self.index_bytes(), before_index)
        print("GIT1_T1=PASS")

    def test_T2_dirty_foreign_worktree_is_preserved_and_absent_from_candidate_delta(self):
        self.write("foreign.txt", b"foreign-base\nX-unrelated\n")
        before = (self.repo / "foreign.txt").read_bytes()
        before_index = self.index_bytes()

        candidate = self.candidate([FileSelection("app.txt", "100644", b"candidate\n")])
        validation = self.validate(candidate)
        commit = self.commit(candidate, validation)
        self.publish(candidate, commit)

        self.assertEqual((self.repo / "foreign.txt").read_bytes(), before)
        self.assertEqual(self.tree_bytes(candidate.tree, "foreign.txt"), b"foreign-base\n")
        self.assertEqual(self.tree_bytes(candidate.tree, "app.txt"), b"candidate\n")
        self.assertEqual(self.index_bytes(), before_index)
        print("GIT1_T2=PASS")

    def test_T3_same_file_two_intentions_candidate_excludes_foreign_bytes(self):
        worktree = b"base\nA-authorized\nX-foreign\n"
        candidate_bytes = b"base\nA-authorized\n"
        self.write("app.txt", worktree)
        before_index = self.index_bytes()

        candidate = self.candidate([FileSelection("app.txt", "100644", candidate_bytes)])
        observed = {}
        def validator(root):
            observed["validated"] = (root / "app.txt").read_bytes()
            return True
        validation = self.validate(candidate, validator)
        commit = self.commit(candidate, validation)
        self.publish(candidate, commit)

        self.assertEqual(observed["validated"], candidate_bytes)
        self.assertEqual(self.tree_bytes(candidate.tree, "app.txt"), candidate_bytes)
        self.assertNotIn(b"X-foreign", self.tree_bytes(candidate.tree, "app.txt"))
        self.assertEqual((self.repo / "app.txt").read_bytes(), worktree)
        self.assertEqual(self.index_bytes(), before_index)
        print("GIT1_T3=PASS")

    def test_T4_validation_receipt_attests_exact_tree_then_commit_tree_matches(self):
        candidate = self.candidate([
            FileSelection("app.txt", "100644", b"validated\n"),
            FileSelection("new.txt", "100644", b"new exact bytes\n"),
        ])
        checked = {}
        def validator(root):
            checked["app"] = (root / "app.txt").read_bytes()
            checked["new"] = (root / "new.txt").read_bytes()
            checked["foreign"] = (root / "foreign.txt").read_bytes()
            return {"suite": "controlled-python-validator"}

        validation = self.validate(candidate, validator)
        self.assertEqual(validation.candidate_tree, candidate.tree)
        self.assertEqual(checked["app"], b"validated\n")
        self.assertEqual(checked["new"], b"new exact bytes\n")
        self.assertEqual(checked["foreign"], b"foreign-base\n")

        commit = self.commit(candidate, validation)
        self.assertEqual(commit.tree, candidate.tree)
        self.assertEqual(self.git("rev-parse", f"{commit.commit}^{{tree}}").strip(), candidate.tree)
        print("GIT1_T4=PASS")

    def test_T5_base_drift_after_validation_is_refused_without_adaptation(self):
        candidate = self.candidate([FileSelection("app.txt", "100644", b"candidate\n")])
        validation = self.validate(candidate)
        self.git("commit", "--allow-empty", "-m", "concurrent drift")
        drifted = self.git("rev-parse", "HEAD").strip()
        self.assertNotEqual(drifted, self.base)

        with self.assertRaisesRegex(PublicationRefusal, "drift"):
            self.commit(candidate, validation)
        self.assertEqual(self.git("rev-parse", "publish").strip(), self.base)
        print("GIT1_T5=PASS")

    def test_T5b_destination_compare_and_swap_refuses_branch_drift(self):
        candidate = self.candidate([FileSelection("app.txt", "100644", b"candidate\n")])
        validation = self.validate(candidate)
        commit = self.commit(candidate, validation)

        drift = self.git(
            "commit-tree", self.base_tree, "-p", self.base,
            input_bytes=b"destination drift\n",
        ).strip()
        self.git("update-ref", "refs/heads/publish", drift, self.base)
        with self.assertRaisesRegex(PublicationRefusal, "destination branch drift"):
            self.publish(candidate, commit)
        self.assertEqual(self.git("rev-parse", "publish").strip(), drift)
        print("GIT1_T5B=PASS")

    def test_T6_foreign_human_staging_refused_and_index_byte_identical(self):
        self.write("foreign.txt", b"foreign staged\n")
        self.git("add", "--", "foreign.txt")
        before = self.index_bytes()
        before_head = self.git("rev-parse", "HEAD").strip()

        with self.assertRaisesRegex(PublicationRefusal, "human index"):
            self.candidate([FileSelection("app.txt", "100644", b"candidate\n")])

        self.assertEqual(self.index_bytes(), before)
        self.assertEqual(self.git("rev-parse", "HEAD").strip(), before_head)
        self.assertEqual(self.git("rev-parse", "publish").strip(), self.base)
        print("GIT1_T6=PASS")

    def test_T7_ambiguous_duplicate_selection_is_refused(self):
        before_index = self.index_bytes()
        with self.assertRaisesRegex(PublicationRefusal, "duplicate/ambiguous"):
            self.candidate([
                FileSelection("app.txt", "100644", b"A\n"),
                FileSelection("app.txt", "100644", b"B\n"),
            ])
        self.assertEqual(self.index_bytes(), before_index)
        self.assertEqual(self.git("rev-parse", "publish").strip(), self.base)
        print("GIT1_T7=PASS")

    def test_T8_detached_head_is_refused_without_destructive_mutation(self):
        self.git("checkout", "--detach", self.base)
        before_index = self.index_bytes()
        before_file = (self.repo / "app.txt").read_bytes()
        with self.assertRaisesRegex(PublicationRefusal, "detached HEAD"):
            build_candidate(
                self.repo,
                source_branch="main",
                expected_base=self.base,
                selections=[FileSelection("app.txt", "100644", b"candidate\n")],
            )
        self.assertEqual(self.index_bytes(), before_index)
        self.assertEqual((self.repo / "app.txt").read_bytes(), before_file)
        self.assertEqual(self.git("rev-parse", "publish").strip(), self.base)
        print("GIT1_T8=PASS")

    def test_supported_delete_and_explicit_executable_mode(self):
        candidate = self.candidate([
            FileSelection("delete.txt", "100644", None, delete=True),
            FileSelection("tool.sh", "100755", b"#!/bin/sh\necho candidate\n"),
        ])
        checked = {}
        def validator(root):
            checked["deleted"] = not (root / "delete.txt").exists()
            checked["mode"] = stat.S_IMODE((root / "tool.sh").stat().st_mode)
            checked["bytes"] = (root / "tool.sh").read_bytes()
            return True

        validation = self.validate(candidate, validator)
        commit = self.commit(candidate, validation)
        self.publish(candidate, commit)
        self.assertTrue(checked["deleted"])
        self.assertEqual(checked["mode"], 0o755)
        self.assertEqual(checked["bytes"], b"#!/bin/sh\necho candidate\n")
        listing = self.git("ls-tree", candidate.tree, "--", "tool.sh")
        self.assertTrue(listing.startswith("100755 blob "))
        self.assertEqual(self.git("ls-tree", candidate.tree, "--", "delete.txt"), "")
        print("GIT1_DELETE_EXEC=PASS")

    def test_checked_out_destination_is_explicitly_unsupported(self):
        candidate = self.candidate([FileSelection("app.txt", "100644", b"candidate\n")])
        validation = self.validate(candidate)
        commit = self.commit(candidate, validation)
        with self.assertRaisesRegex(PublicationRefusal, "checked-out branch"):
            publish_ref(
                candidate,
                commit,
                destination_branch="main",
                expected_old=self.base,
            )
        self.assertEqual(self.git("rev-parse", "main").strip(), self.base)
        print("GIT1_CURRENT_BRANCH_PUBLISH=REFUSED")

    def test_symlink_in_candidate_tree_is_refused_before_commit_or_ref_move(self):
        os.symlink("app.txt", self.repo / "link")
        self.git("add", "--", "link")
        self.git("commit", "-m", "base with symlink")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.base_tree = self.git("rev-parse", "HEAD^{tree}").strip()
        self.git("branch", "-f", "publish", self.base)
        candidate = self.candidate([FileSelection("app.txt", "100644", b"candidate\n")])
        with self.assertRaisesRegex(PublicationRefusal, "symlink/gitlink"):
            self.validate(candidate)
        self.assertEqual(self.git("rev-parse", "publish").strip(), self.base)
        print("GIT1_SYMLINK=REFUSED")


if __name__ == "__main__":
    unittest.main(verbosity=2)
