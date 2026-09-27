import tempfile
import unittest
from pathlib import Path

import memory_contract as contract


class MemoryContractTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)

    def note(self, name, text="note"):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def test_tiers_are_deterministic_and_proposal_only(self):
        self.note("DECISIONS.md", "D" * 2300)
        self.note("notes/next.txt", "continuer")
        self.note("archives/handoff.md", "ancien")
        self.note("RUNBOOK.md", "étapes")
        result = contract.inspect(self.root)
        levels = {row["path"]: row["candidate_level"] for row in result["inventory"]["notes"]}
        self.assertEqual(levels, {"DECISIONS.md": "core", "RUNBOOK.md": "procedural", "archives/handoff.md": "archive", "notes/next.txt": "recall"})
        self.assertEqual(result["mode"], "proposal_only")
        self.assertFalse(result["writes_performed"])
        self.assertFalse(result["contract"]["automatic_injection"])
        self.assertTrue(any(p["action"] == "review_for_compaction" for p in result["proposals"]))

    def test_duplicate_detection_does_not_change_notes(self):
        self.note("a.md", "même note")
        self.note("folder/b.txt", "même note")
        before = (self.root / "a.md").read_text()
        result = contract.inspect(self.root)
        self.assertEqual(result["inventory"]["duplicate_groups"], [["a.md", "folder/b.txt"]])
        self.assertTrue(any(p["action"] == "review_duplicate_notes" for p in result["proposals"]))
        self.assertEqual((self.root / "a.md").read_text(), before)

    def test_hidden_and_symlinked_files_are_not_inventory_items(self):
        self.note("visible.md")
        self.note(".hidden.md")
        target = self.root / "visible.md"
        (self.root / "linked.md").symlink_to(target)
        paths = [row["path"] for row in contract.inspect(self.root)["inventory"]["notes"]]
        self.assertEqual(paths, ["visible.md"])


if __name__ == "__main__":
    unittest.main()
