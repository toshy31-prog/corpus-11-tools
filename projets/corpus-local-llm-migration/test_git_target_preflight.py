from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import git_target_preflight as gpf


def run(repo, *args):
    cp=subprocess.run(["git","-C",str(repo),*args],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if cp.returncode:
        raise RuntimeError(cp.stderr or cp.stdout)
    return cp.stdout.strip()


class GitTargetPreflightTests(unittest.TestCase):
    def fixture(self):
        td=tempfile.TemporaryDirectory()
        repo=Path(td.name)/"repo"; repo.mkdir()
        run(repo,"init","-b","main")
        run(repo,"config","user.email","fixture@example.invalid")
        run(repo,"config","user.name","Fixture")
        (repo/"a.txt").write_text("a0\n")
        (repo/"b.txt").write_text("b0\n")
        run(repo,"add","a.txt","b.txt")
        run(repo,"commit","-m","base")
        head=run(repo,"rev-parse","HEAD")
        run(repo,"update-ref","refs/remotes/origin/main",head)
        return td,repo,head

    def row(self,value,path):
        return next(row for row in value["paths"] if row["path"]==path)

    def test_exact_head_origin_and_clean_blobs(self):
        td,repo,head=self.fixture()
        with td:
            value=gpf.git_preflight(repo,["a.txt"])
            row=self.row(value,"a.txt")
            self.assertEqual(value["HEAD"],head)
            self.assertEqual(value["origin_main_oid"],head)
            self.assertEqual(row["HEAD_BLOB"],row["INDEX_BLOB"])
            self.assertEqual(row["INDEX_BLOB"],row["WORKTREE_BLOB"])
            self.assertEqual(row["status"],"clean")

    def test_modified_worktree_is_distinguished(self):
        td,repo,_=self.fixture()
        with td:
            (repo/"a.txt").write_text("a1\n")
            row=self.row(gpf.git_preflight(repo,["a.txt"]),"a.txt")
            self.assertEqual(row["HEAD_BLOB"],row["INDEX_BLOB"])
            self.assertNotEqual(row["INDEX_BLOB"],row["WORKTREE_BLOB"])
            self.assertEqual(row["status"],"modified_worktree")

    def test_staged_target_is_distinguished(self):
        td,repo,_=self.fixture()
        with td:
            (repo/"a.txt").write_text("a1\n"); run(repo,"add","a.txt")
            row=self.row(gpf.git_preflight(repo,["a.txt"]),"a.txt")
            self.assertNotEqual(row["HEAD_BLOB"],row["INDEX_BLOB"])
            self.assertEqual(row["INDEX_BLOB"],row["WORKTREE_BLOB"])
            self.assertEqual(row["status"],"staged")

    def test_conflict_is_explicit(self):
        td,repo,_=self.fixture()
        with td:
            run(repo,"checkout","-b","side")
            (repo/"a.txt").write_text("side\n")
            run(repo,"add","a.txt")
            run(repo,"commit","-m","side")
            run(repo,"checkout","main")
            (repo/"a.txt").write_text("main\n")
            run(repo,"add","a.txt")
            run(repo,"commit","-m","main")
            cp=subprocess.run(
                ["git","-C",str(repo),"merge","side"],
                text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
            )
            self.assertNotEqual(cp.returncode,0)
            row=self.row(gpf.git_preflight(repo,["a.txt"]),"a.txt")
            self.assertEqual(row["status"],"conflict")
            self.assertIsNone(row["INDEX_BLOB"])
            self.assertGreaterEqual(len(row["INDEX_CONFLICT_ENTRIES"]),2)
            self.assertTrue(all(entry["stage"] in {"1","2","3"} for entry in row["INDEX_CONFLICT_ENTRIES"]))

    def test_untracked_and_missing_are_explicit(self):
        td,repo,_=self.fixture()
        with td:
            (repo/"u.txt").write_text("u\n")
            value=gpf.git_preflight(repo,["u.txt","missing.txt"])
            self.assertEqual(self.row(value,"u.txt")["status"],"untracked")
            self.assertEqual(self.row(value,"missing.txt")["status"],"missing")

    def test_path_escape_refused(self):
        td,repo,_=self.fixture()
        with td:
            for path in ("../a.txt","/tmp/a.txt",".git/config","a/../b"):
                with self.assertRaises(gpf.GitPreflightRefusal):
                    gpf.git_preflight(repo,[path])

    def test_read_only_and_no_remote_contact(self):
        td,repo,_=self.fixture()
        with td:
            (repo/"a.txt").write_text("dirty\n")
            index_before=(repo/".git/index").read_bytes()
            refs_before=run(repo,"show-ref")
            wt_before=(repo/"a.txt").read_bytes()
            with patch.object(gpf,"_run",wraps=gpf._run) as wrapped:
                gpf.git_preflight(repo,["a.txt","b.txt"])
            commands=[" ".join(call.args[1]) for call in wrapped.call_args_list if len(call.args)>1]
            forbidden=("fetch","push","pull","ls-remote","update-index","update-ref","add","commit","checkout","reset","stash","clean")
            self.assertFalse(any(any(word in cmd.split() for word in forbidden) for cmd in commands))
            self.assertEqual((repo/".git/index").read_bytes(),index_before)
            self.assertEqual(run(repo,"show-ref"),refs_before)
            self.assertEqual((repo/"a.txt").read_bytes(),wt_before)


if __name__=="__main__":
    unittest.main()
