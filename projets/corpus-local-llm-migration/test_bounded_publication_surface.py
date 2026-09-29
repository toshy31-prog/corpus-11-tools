from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

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


    def worktree_selection(self, repo, base, path):
        head_blob = run(repo, "rev-parse", f"{base}:{path}")
        worktree_blob = run(repo, "hash-object", path)
        return surf.WorktreeSelection(
            path=path,
            expected_head_blob=head_blob,
            expected_worktree_blob=worktree_blob,
        )

    def test_worktree_two_file_commit_is_exact_and_preserves_foreign_dirty(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "app.txt").write_bytes(b"app-local\n")
            (repo / "foreign.txt").write_bytes(b"foreign-local\n")
            (repo / "second.txt").write_bytes(b"second-base\n")
            run(repo, "add", "second.txt")
            run(repo, "commit", "-m", "add second")
            base = run(repo, "rev-parse", "HEAD")
            (repo / "app.txt").write_bytes(b"app-local\n")
            (repo / "second.txt").write_bytes(b"second-local\n")
            (repo / "foreign.txt").write_bytes(b"foreign-local\n")
            foreign_before = (repo / "foreign.txt").read_bytes()
            files = [
                self.worktree_selection(repo, base, "app.txt"),
                self.worktree_selection(repo, base, "second.txt"),
            ]
            prepared = surf.prepare_worktree_commit(
                repo,
                source_branch="main",
                expected_base=base,
                files=files,
                validator=lambda root: (
                    (root / "app.txt").read_bytes() == b"app-local\n"
                    and (root / "second.txt").read_bytes() == b"second-local\n"
                    and (root / "foreign.txt").read_bytes() == b"foreign-base\n"
                ),
                message="two exact files",
            )
            commit = surf.commit_prepared_worktree(prepared)
            self.assertEqual(commit.parent, base)
            self.assertEqual(commit.tree, prepared.candidate.tree)
            names = set(run(repo, "diff-tree", "--no-commit-id", "--name-only", "-r", commit.commit).splitlines())
            self.assertEqual(names, {"app.txt", "second.txt"})
            self.assertEqual((repo / "foreign.txt").read_bytes(), foreign_before)
            self.assertEqual(run(repo, "rev-parse", "HEAD"), base)

    def test_worktree_target_change_after_prepare_is_refused(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "app.txt").write_bytes(b"candidate\n")
            files = [self.worktree_selection(repo, base, "app.txt")]
            prepared = surf.prepare_worktree_commit(
                repo, source_branch="main", expected_base=base, files=files,
                validator=lambda root: True, message="candidate",
            )
            (repo / "app.txt").write_bytes(b"changed-after-prepare\n")
            with self.assertRaisesRegex(git1.PublicationRefusal, "unexpected worktree blob"):
                surf.commit_prepared_worktree(prepared)

    def test_worktree_head_drift_after_prepare_is_refused(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "app.txt").write_bytes(b"candidate\n")
            prepared = surf.prepare_worktree_commit(
                repo, source_branch="main", expected_base=base,
                files=[self.worktree_selection(repo, base, "app.txt")],
                validator=lambda root: True, message="candidate",
            )
            (repo / "foreign.txt").write_bytes(b"next\n")
            run(repo, "add", "foreign.txt")
            run(repo, "commit", "-m", "advance")
            with self.assertRaisesRegex(git1.PublicationRefusal, "base/head drift"):
                surf.commit_prepared_worktree(prepared)

    def test_worktree_unexpected_blob_and_path_escape_are_refused(self):
        td, repo, base = self.fixture()
        with td:
            good = self.worktree_selection(repo, base, "app.txt")
            bad = surf.WorktreeSelection(
                path=good.path,
                expected_head_blob=good.expected_head_blob,
                expected_worktree_blob="0" * len(good.expected_worktree_blob),
            )
            with self.assertRaisesRegex(git1.PublicationRefusal, "unexpected worktree blob"):
                surf.prepare_worktree_commit(
                    repo, source_branch="main", expected_base=base, files=[bad],
                    validator=lambda root: True, message="bad",
                )
            escape = surf.WorktreeSelection(
                path="../app.txt",
                expected_head_blob=good.expected_head_blob,
                expected_worktree_blob=good.expected_worktree_blob,
            )
            with self.assertRaisesRegex(git1.PublicationRefusal, "invalid path"):
                surf.prepare_worktree_commit(
                    repo, source_branch="main", expected_base=base, files=[escape],
                    validator=lambda root: True, message="escape",
                )

    def test_worktree_foreign_index_is_refused_not_embedded(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "app.txt").write_bytes(b"candidate\n")
            files = [self.worktree_selection(repo, base, "app.txt")]
            (repo / "foreign.txt").write_bytes(b"staged\n")
            run(repo, "add", "foreign.txt")
            with self.assertRaisesRegex(git1.PublicationRefusal, "human index"):
                surf.prepare_worktree_commit(
                    repo, source_branch="main", expected_base=base, files=files,
                    validator=lambda root: True, message="candidate",
                )
            self.assertEqual(run(repo, "diff", "--cached", "--name-only"), "foreign.txt")


    def prepare_one_worktree_commit(self, repo, base, content=b"candidate\n"):
        (repo / "app.txt").write_bytes(content)
        prepared = surf.prepare_worktree_commit(
            repo,
            source_branch="main",
            expected_base=base,
            files=[self.worktree_selection(repo, base, "app.txt")],
            validator=lambda root: (root / "app.txt").read_bytes() == content,
            message="candidate",
        )
        commit = surf.commit_prepared_worktree(prepared)
        return prepared, commit

    def test_checked_out_source_cas_happy_path_preserves_index_worktree_and_other_refs(self):
        td, repo, base = self.fixture()
        with td:
            run(repo, "branch", "other", base)
            (repo / "foreign.txt").write_bytes(b"foreign-local\n")
            foreign_before = (repo / "foreign.txt").read_bytes()
            index_before = (repo / ".git/index").read_bytes()
            other_before = run(repo, "rev-parse", "refs/heads/other")
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            receipt = surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)
            self.assertEqual(receipt.ref, "refs/heads/main")
            self.assertEqual(receipt.old, base)
            self.assertEqual(receipt.new, commit.commit)
            self.assertEqual(run(repo, "rev-parse", "HEAD"), commit.commit)
            self.assertEqual(run(repo, "rev-parse", "refs/heads/main"), commit.commit)
            self.assertEqual(run(repo, "rev-parse", "refs/heads/other"), other_before)
            self.assertEqual((repo / ".git/index").read_bytes(), index_before)
            self.assertEqual((repo / "foreign.txt").read_bytes(), foreign_before)
            self.assertEqual((repo / "app.txt").read_bytes(), b"candidate\n")

    def test_checked_out_source_cas_refuses_stale_main(self):
        td, repo, base = self.fixture()
        with td:
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            (repo / "foreign.txt").write_bytes(b"next\n")
            run(repo, "add", "foreign.txt")
            run(repo, "commit", "-m", "advance")
            with self.assertRaisesRegex(git1.PublicationRefusal, "base/head drift|source branch stale"):
                surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)

    def test_checked_out_source_cas_refuses_wrong_checked_out_branch(self):
        td, repo, base = self.fixture()
        with td:
            run(repo, "branch", "other", base)
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            run(repo, "checkout", "other")
            with self.assertRaisesRegex(git1.PublicationRefusal, "source branch changed|HEAD no longer points"):
                surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)

    def test_checked_out_source_cas_refuses_forged_receipt(self):
        td, repo, base = self.fixture()
        with td:
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            forged = git1.CommitReceipt(commit=commit.commit, tree="0"*40, parent=commit.parent)
            with self.assertRaisesRegex(git1.PublicationRefusal, "commit tree mismatch"):
                surf.cas_checked_out_source_branch(prepared, forged, expected_old=base)

    def test_checked_out_source_cas_refuses_wrong_parent(self):
        td, repo, base = self.fixture()
        with td:
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            forged = git1.CommitReceipt(commit=commit.commit, tree=commit.tree, parent="0"*40)
            with self.assertRaisesRegex(git1.PublicationRefusal, "commit parent mismatch"):
                surf.cas_checked_out_source_branch(prepared, forged, expected_old=base)

    def test_checked_out_source_cas_refuses_target_drift_after_commit(self):
        td, repo, base = self.fixture()
        with td:
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            (repo / "app.txt").write_bytes(b"drift\n")
            with self.assertRaisesRegex(git1.PublicationRefusal, "unexpected worktree blob"):
                surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)

    def test_checked_out_source_cas_contacts_no_remote(self):
        td, repo, base = self.fixture()
        with td:
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            with patch.object(git1, "_run", wraps=git1._run) as wrapped:
                surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)
            flat = [" ".join(call.args[1]) for call in wrapped.call_args_list if len(call.args) > 1]
            self.assertFalse(any("push" in x or "fetch" in x or "ls-remote" in x for x in flat))


    def test_reconcile_published_targets_updates_only_targets(self):
        td, repo, base = self.fixture()
        with td:
            run(repo, "branch", "other", base)
            (repo / "app.txt").write_bytes(b"candidate\n")
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            cas = surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)
            foreign_before = run(repo, "ls-files", "-s", "--", "foreign.txt")
            worktree_before = (repo / "app.txt").read_bytes()
            receipt = surf.reconcile_published_target_index(prepared, commit, cas)
            self.assertTrue(receipt["foreign_index_entries_preserved"])
            self.assertEqual(run(repo, "ls-files", "-s", "--", "foreign.txt"), foreign_before)
            self.assertEqual((repo / "app.txt").read_bytes(), worktree_before)
            self.assertEqual(
                run(repo, "ls-files", "-s", "--", "app.txt").split()[1],
                run(repo, "rev-parse", f"{commit.commit}:app.txt"),
            )

    def test_reconcile_concurrent_foreign_lock_race_is_never_deleted(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "app.txt").write_bytes(b"candidate\n")
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            cas = surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)
            lock = repo / ".git/index.lock"
            index_before = (repo / ".git/index").read_bytes()
            real_open = surf.os.open

            def race_open(path, flags, mode=0o777):
                Path(path).write_bytes(b"foreign-lock")
                raise FileExistsError(path)

            with patch.object(surf.os, "open", side_effect=race_open):
                with self.assertRaisesRegex(git1.PublicationRefusal, "index lock present"):
                    surf.reconcile_published_target_index(prepared, commit, cas)

            self.assertTrue(lock.exists())
            self.assertEqual(lock.read_bytes(), b"foreign-lock")
            self.assertEqual((repo / ".git/index").read_bytes(), index_before)

    def test_reconcile_existing_foreign_lock_is_never_deleted(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "app.txt").write_bytes(b"candidate\n")
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            cas = surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)
            lock = repo / ".git/index.lock"
            lock.write_bytes(b"foreign-entry-lock")
            index_before = (repo / ".git/index").read_bytes()

            with self.assertRaisesRegex(git1.PublicationRefusal, "index lock present"):
                surf.reconcile_published_target_index(prepared, commit, cas)

            self.assertTrue(lock.exists())
            self.assertEqual(lock.read_bytes(), b"foreign-entry-lock")
            self.assertEqual((repo / ".git/index").read_bytes(), index_before)

    def test_reconcile_error_after_own_lock_cleans_only_own_lock(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "app.txt").write_bytes(b"candidate\n")
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            cas = surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)
            lock = repo / ".git/index.lock"
            index_before = (repo / ".git/index").read_bytes()

            with patch.object(
                surf,
                "_index_rows_for_path",
                side_effect=git1.PublicationRefusal("forced after acquire"),
            ):
                with self.assertRaisesRegex(git1.PublicationRefusal, "forced after acquire"):
                    surf.reconcile_published_target_index(prepared, commit, cas)

            self.assertFalse(lock.exists())
            self.assertEqual((repo / ".git/index").read_bytes(), index_before)

    def test_reconcile_success_leaves_no_lock_residue(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "app.txt").write_bytes(b"candidate\n")
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            cas = surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)
            lock = repo / ".git/index.lock"

            surf.reconcile_published_target_index(prepared, commit, cas)

            self.assertFalse(lock.exists())
            self.assertEqual(run(repo, "write-tree"), run(repo, "rev-parse", "HEAD^{tree}"))

    def test_reconcile_preserves_foreign_staging_exactly(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "app.txt").write_bytes(b"candidate\n")
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            cas = surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)
            (repo / "foreign.txt").write_bytes(b"foreign-staged\n")
            run(repo, "add", "foreign.txt")
            foreign_before = run(repo, "ls-files", "-s", "--", "foreign.txt")
            surf.reconcile_published_target_index(prepared, commit, cas)
            self.assertEqual(run(repo, "ls-files", "-s", "--", "foreign.txt"), foreign_before)

    def test_reconcile_refuses_concurrent_target_restage(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "app.txt").write_bytes(b"candidate\n")
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            cas = surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)
            (repo / "app.txt").write_bytes(b"restaged-user\n")
            run(repo, "add", "app.txt")
            with self.assertRaisesRegex(git1.PublicationRefusal, "target index changed"):
                surf.reconcile_published_target_index(prepared, commit, cas)

    def test_reconcile_preserves_changed_target_worktree_bytes(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "app.txt").write_bytes(b"candidate\n")
            prepared, commit = self.prepare_one_worktree_commit(repo, base)
            cas = surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)
            (repo / "app.txt").write_bytes(b"user-after-cas\n")
            before = (repo / "app.txt").read_bytes()
            surf.reconcile_published_target_index(prepared, commit, cas)
            self.assertEqual((repo / "app.txt").read_bytes(), before)
            self.assertEqual(
                run(repo, "ls-files", "-s", "--", "app.txt").split()[1],
                run(repo, "rev-parse", f"{commit.commit}:app.txt"),
            )
            self.assertEqual(run(repo, "diff", "--name-only", "--", "app.txt"), "app.txt")
            self.assertEqual(run(repo, "diff", "--cached", "--name-only", "--", "app.txt"), "")

    def test_reconcile_published_targets_enables_second_publication(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "app.txt").write_bytes(b"p1\n")
            p1, k1 = self.prepare_one_worktree_commit(repo, base, b"p1\n")
            c1 = surf.cas_checked_out_source_branch(p1, k1, expected_old=base)
            surf.reconcile_published_target_index(p1, k1, c1)
            self.assertEqual(run(repo, "write-tree"), run(repo, "rev-parse", "HEAD^{tree}"))

            (repo / "foreign.txt").write_bytes(b"p2\n")
            p2 = surf.prepare_worktree_commit(
                repo,
                source_branch="main",
                expected_base=k1.commit,
                files=[self.worktree_selection(repo, k1.commit, "foreign.txt")],
                validator=lambda root: (root / "foreign.txt").read_bytes() == b"p2\n",
                message="p2",
            )
            k2 = surf.commit_prepared_worktree(p2)
            self.assertEqual(k2.parent, k1.commit)


    def new_selection(self, repo, path, mode):
        return surf.WorktreeSelection(
            path=path,
            expected_head_blob=None,
            expected_worktree_blob=run(repo, "hash-object", path),
            mode=mode,
        )

    def test_mixed_tracked_and_two_new_full_chain_then_second_publication(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "app.txt").write_bytes(b"tracked-p1\n")
            (repo / "new-a.txt").write_bytes(b"new-a\n")
            (repo / "new-b.sh").write_bytes(b"#!/bin/sh\necho b\n")
            (repo / "new-b.sh").chmod(0o755)
            (repo / "foreign.txt").write_bytes(b"foreign-p2\n")
            (repo / "noise.txt").write_bytes(b"noise-untracked\n")
            foreign_before = (repo / "foreign.txt").read_bytes()
            noise_before = (repo / "noise.txt").read_bytes()

            files = [
                self.worktree_selection(repo, base, "app.txt"),
                self.new_selection(repo, "new-a.txt", "100644"),
                self.new_selection(repo, "new-b.sh", "100755"),
            ]

            with patch.object(git1, "_run", wraps=git1._run) as wrapped:
                p1 = surf.prepare_worktree_commit(
                    repo,
                    source_branch="main",
                    expected_base=base,
                    files=files,
                    validator=lambda root: (
                        (root / "app.txt").read_bytes() == b"tracked-p1\n"
                        and (root / "new-a.txt").read_bytes() == b"new-a\n"
                        and (root / "new-b.sh").read_bytes() == b"#!/bin/sh\necho b\n"
                        and bool((root / "new-b.sh").stat().st_mode & 0o111)
                        and (root / "foreign.txt").read_bytes() == b"foreign-base\n"
                        and not (root / "noise.txt").exists()
                    ),
                    message="mixed p1",
                )
                k1 = surf.commit_prepared_worktree(p1)
                self.assertEqual(
                    set(run(repo, "diff-tree", "--no-commit-id", "--name-only", "-r", k1.commit).splitlines()),
                    {"app.txt", "new-a.txt", "new-b.sh"},
                )
                self.assertTrue(run(repo, "ls-tree", k1.commit, "--", "new-a.txt").startswith("100644 "))
                self.assertTrue(run(repo, "ls-tree", k1.commit, "--", "new-b.sh").startswith("100755 "))
                c1 = surf.cas_checked_out_source_branch(p1, k1, expected_old=base)
                surf.reconcile_published_target_index(p1, k1, c1)

                self.assertEqual(run(repo, "write-tree"), run(repo, "rev-parse", "HEAD^{tree}"))
                self.assertEqual((repo / "foreign.txt").read_bytes(), foreign_before)
                self.assertEqual((repo / "noise.txt").read_bytes(), noise_before)
                self.assertEqual(run(repo, "ls-files", "--", "noise.txt"), "")

                p2 = surf.prepare_worktree_commit(
                    repo,
                    source_branch="main",
                    expected_base=k1.commit,
                    files=[self.worktree_selection(repo, k1.commit, "foreign.txt")],
                    validator=lambda root: (root / "foreign.txt").read_bytes() == b"foreign-p2\n",
                    message="tracked p2",
                )
                k2 = surf.commit_prepared_worktree(p2)
                c2 = surf.cas_checked_out_source_branch(p2, k2, expected_old=k1.commit)
                surf.reconcile_published_target_index(p2, k2, c2)

            commands = [" ".join(call.args[1]) for call in wrapped.call_args_list if len(call.args) > 1]
            self.assertFalse(any(any(x in cmd.split() for x in ("push","fetch","pull","ls-remote")) for cmd in commands))
            self.assertEqual(run(repo, "write-tree"), run(repo, "rev-parse", "HEAD^{tree}"))
            self.assertEqual((repo / "noise.txt").read_bytes(), noise_before)

    def test_new_declared_absent_but_tracked_is_refused(self):
        td, repo, base = self.fixture()
        with td:
            good = self.worktree_selection(repo, base, "app.txt")
            new_claim = surf.WorktreeSelection(
                path="app.txt",
                expected_head_blob=None,
                expected_worktree_blob=good.expected_worktree_blob,
                mode="100644",
            )
            with self.assertRaisesRegex(git1.PublicationRefusal, "expected absent target is tracked"):
                surf.prepare_worktree_commit(
                    repo, source_branch="main", expected_base=base,
                    files=[new_claim], validator=lambda root: True, message="bad",
                )

    def test_new_target_already_staged_is_refused(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "new.txt").write_bytes(b"new\n")
            selection = self.new_selection(repo, "new.txt", "100644")
            run(repo, "add", "new.txt")
            with self.assertRaisesRegex(git1.PublicationRefusal, "new target index entry must be absent"):
                surf.prepare_worktree_commit(
                    repo, source_branch="main", expected_base=base,
                    files=[selection], validator=lambda root: True, message="bad",
                )

    def test_new_target_bytes_or_mode_change_after_prepare_is_refused(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "new.txt").write_bytes(b"new\n")
            selection = self.new_selection(repo, "new.txt", "100644")
            prepared = surf.prepare_worktree_commit(
                repo, source_branch="main", expected_base=base,
                files=[selection], validator=lambda root: True, message="new",
            )
            (repo / "new.txt").write_bytes(b"changed\n")
            with self.assertRaisesRegex(git1.PublicationRefusal, "unexpected worktree blob"):
                surf.commit_prepared_worktree(prepared)

        td, repo, base = self.fixture()
        with td:
            (repo / "new.txt").write_bytes(b"new\n")
            selection = self.new_selection(repo, "new.txt", "100644")
            prepared = surf.prepare_worktree_commit(
                repo, source_branch="main", expected_base=base,
                files=[selection], validator=lambda root: True, message="new",
            )
            (repo / "new.txt").chmod(0o755)
            with self.assertRaisesRegex(git1.PublicationRefusal, "unexpected worktree mode"):
                surf.commit_prepared_worktree(prepared)

    def test_new_target_staged_after_cas_before_reconcile_is_refused(self):
        td, repo, base = self.fixture()
        with td:
            (repo / "new.txt").write_bytes(b"new\n")
            prepared = surf.prepare_worktree_commit(
                repo, source_branch="main", expected_base=base,
                files=[self.new_selection(repo, "new.txt", "100644")],
                validator=lambda root: True, message="new",
            )
            commit = surf.commit_prepared_worktree(prepared)
            cas = surf.cas_checked_out_source_branch(prepared, commit, expected_old=base)
            (repo / "new.txt").write_bytes(b"user-stage\n")
            run(repo, "add", "new.txt")
            with self.assertRaisesRegex(git1.PublicationRefusal, "new target index entry appeared"):
                surf.reconcile_published_target_index(prepared, commit, cas)

    def test_new_target_missing_symlink_or_forbidden_path_is_refused(self):
        td, repo, base = self.fixture()
        with td:
            missing = surf.WorktreeSelection(
                path="missing.txt", expected_head_blob=None,
                expected_worktree_blob="0"*40, mode="100644",
            )
            with self.assertRaisesRegex(git1.PublicationRefusal, "target missing|unexpected worktree blob"):
                surf.prepare_worktree_commit(
                    repo, source_branch="main", expected_base=base,
                    files=[missing], validator=lambda root: True, message="missing",
                )

            (repo / "real.txt").write_bytes(b"real\n")
            (repo / "link.txt").symlink_to(repo / "real.txt")
            link = surf.WorktreeSelection(
                path="link.txt", expected_head_blob=None,
                expected_worktree_blob=run(repo, "hash-object", "real.txt"), mode="100644",
            )
            with self.assertRaisesRegex(git1.PublicationRefusal, "symlink target refused"):
                surf.prepare_worktree_commit(
                    repo, source_branch="main", expected_base=base,
                    files=[link], validator=lambda root: True, message="link",
                )

            forbidden = surf.WorktreeSelection(
                path="../escape.txt", expected_head_blob=None,
                expected_worktree_blob="0"*40, mode="100644",
            )
            with self.assertRaisesRegex(git1.PublicationRefusal, "invalid path"):
                surf.prepare_worktree_commit(
                    repo, source_branch="main", expected_base=base,
                    files=[forbidden], validator=lambda root: True, message="escape",
                )

    def test_surface_has_no_remote_push_api(self):
        self.assertFalse(hasattr(surf, "push"))
        self.assertFalse(hasattr(surf, "publish_remote"))
        self.assertFalse(hasattr(surf, "publish_everything"))


if __name__ == "__main__":
    unittest.main()
