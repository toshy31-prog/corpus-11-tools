import unittest

import source_ownership_protocol as o

A = "1" * 40
B = "2" * 40


def d(frontier, *, read=(), write=(), baseline=A, purpose=None):
    value = {
        "frontier_id": frontier,
        "baseline_head": baseline,
        "read_set": list(read),
        "write_set": list(write),
    }
    if purpose is not None:
        value["purpose"] = purpose
    return value


class OwnershipProtocolTests(unittest.TestCase):
    def test_P1_write_write_conflict(self):
        r = o.compare_declarations(d("A", write=["foo.py"]), d("B", write=["foo.py"]))
        self.assertEqual(r["status"], "conflict")
        self.assertEqual(r["conflicts"]["write_write"], ["foo.py"])

    def test_P2_read_write_conflict(self):
        r = o.compare_declarations(d("A", read=["foo.py"]), d("B", write=["foo.py"]))
        self.assertEqual(r["status"], "conflict")
        self.assertEqual(r["conflicts"]["left_read_right_write"], ["foo.py"])

    def test_P3_read_read_compatible(self):
        r = o.compare_declarations(d("A", read=["foo.py"]), d("B", read=["foo.py"]))
        self.assertEqual(r["status"], "compatible")
        self.assertEqual(r["conflict_paths"], [])

    def test_P4_disjoint_writes_compatible(self):
        r = o.compare_declarations(d("A", write=["foo.py"]), d("B", write=["bar.py"]))
        self.assertEqual(r["status"], "compatible")

    def test_P5_duplicate_path_refused(self):
        r = o.compare_declarations(d("A", write=["foo.py", "foo.py"]), d("B"))
        self.assertEqual(r["status"], "invalid_declaration")
        self.assertEqual(r["invalid_side"], "left")

    def test_P6_invalid_paths_refused(self):
        for path in ("../foo.py", "/tmp/foo.py", ".git/config", "a\\b.py", "dir/"):
            with self.subTest(path=path):
                r = o.compare_declarations(d("A", write=[path]), d("B"))
                self.assertEqual(r["status"], "invalid_declaration")

    def test_P7_REL_fixture_conflicts_before_job(self):
        target = "projets/corpus-local-llm-migration/corpus_gpt_reload.py"
        rel = d("REL4", write=[target])
        patcher = d("job:corpus-reload-state-v2", write=[target])
        r = o.compare_declarations(rel, patcher)
        self.assertEqual(r["status"], "conflict")
        self.assertEqual(r["conflict_paths"], [target])

    def test_P8_AUTH_fixture_same_mcp_conflicts(self):
        target = "projets/corpus-local-llm-migration/corpus_gpt_mcp.py"
        r = o.compare_declarations(d("AUTH7", write=[target]), d("SURF2", write=[target]))
        self.assertEqual(r["status"], "conflict")

    def test_P9_DOC_reader_writer_deferred_as_conflict(self):
        target = "tools/corpus-gpt/ARCHITECTURE.md"
        r = o.compare_declarations(d("DOC-reader", read=[target]), d("DOCTRINE-writer", write=[target]))
        self.assertEqual(r["status"], "conflict")
        self.assertEqual(r["conflict_paths"], [target])

    def test_different_baselines_do_not_conflict_when_disjoint(self):
        r = o.compare_declarations(
            d("A", write=["foo.py"], baseline=A),
            d("B", write=["bar.py"], baseline=B),
        )
        self.assertEqual(r["status"], "compatible")
        self.assertEqual(r["baseline_relation"], "different")

    def test_current_head_surfaces_stale_baseline(self):
        r = o.compare_declarations(
            d("A", read=["foo.py"], baseline=A),
            d("B", read=["bar.py"], baseline=B),
            current_head=A,
        )
        self.assertEqual(r["status"], "stale_baseline")
        self.assertEqual(r["stale_frontiers"], ["B"])

    def test_conflict_precedes_stale_but_staleness_remains_visible(self):
        r = o.compare_declarations(
            d("A", write=["foo.py"], baseline=A),
            d("B", write=["foo.py"], baseline=B),
            current_head=A,
        )
        self.assertEqual(r["status"], "conflict")
        self.assertEqual(r["stale_frontiers"], ["B"])

    def test_same_path_read_and_write_in_one_declaration_is_ambiguous(self):
        r = o.compare_declarations(d("A", read=["foo.py"], write=["foo.py"]), d("B"))
        self.assertEqual(r["status"], "invalid_declaration")


if __name__ == "__main__":
    unittest.main()
