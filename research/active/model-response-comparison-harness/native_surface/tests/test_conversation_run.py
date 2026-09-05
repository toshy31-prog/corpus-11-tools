#!/usr/bin/env python3
from __future__ import annotations

import tempfile
import unittest
from argparse import Namespace
from pathlib import Path

import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from conversation_run import RunError, complete, prepare, recover, start  # noqa: E402


RAW = "Le score observé prouve-t-il l'amélioration réelle ?"


def arguments(attempt: Path, **changes: object) -> Namespace:
    values: dict[str, object] = {
        "attempt": attempt,
        "raw_prompt": RAW,
        "conclusion": "Non. Le score seul ne le prouve pas.",
        "uncertainty": ["Une amélioration réelle reste possible."],
        "reversal": ["Une mesure indépendante cohérente ferait réviser la conclusion."],
        "route": ["construct-validity-assessment"],
        "dependency": ["method-effect-audit"],
        "detail": "standard",
    }
    values.update(changes)
    return Namespace(**values)


class ConversationRunTests(unittest.TestCase):
    def test_valid_run_is_resumed_without_new_attempt(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first = prepare(root, RAW)
            attempt = Path(first["attempt"])
            start(attempt)
            completed = complete(arguments(attempt))
            resumed = prepare(root, RAW)
            self.assertEqual(resumed["state"], "resume_verified")
            self.assertEqual(resumed["attempt"], str(attempt))
            self.assertEqual(resumed["conversation"], completed["conversation"])
            self.assertEqual(len(list((root / next(iter(root.iterdir())).name).glob("attempt-*"))), 1)

    def test_interrupted_attempt_is_preserved_and_new_attempt_is_used(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            interrupted = Path(prepare(root, RAW)["attempt"])
            start(interrupted)
            replacement = Path(prepare(root, RAW)["attempt"])
            self.assertNotEqual(interrupted, replacement)
            self.assertTrue((interrupted / "job.json").exists())
            self.assertEqual(replacement.name, "attempt-002")
            start(replacement)
            complete(arguments(replacement))
            resumed = prepare(root, RAW)
            self.assertEqual(resumed["attempt"], str(replacement))

    def test_recover_returns_verified_render_after_display_interruption(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            attempt = Path(prepare(Path(directory), RAW)["attempt"])
            start(attempt)
            complete(arguments(attempt))
            recovered = recover(attempt)
            self.assertEqual(recovered["state"], "recovered_verified_render")
            self.assertIn("Conclusion", recovered["conversation"])

    def test_nonwritable_target_fails_before_analysis(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "not-a-directory"
            root.write_text("occupied", encoding="utf-8")
            with self.assertRaisesRegex(RunError, "analysis has not started"):
                prepare(root, RAW)
            self.assertEqual(root.read_text(encoding="utf-8"), "occupied")

    def test_completion_failure_does_not_overwrite_attempt(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            attempt = Path(prepare(root, RAW)["attempt"])
            start(attempt)
            with self.assertRaisesRegex(RunError, "failed"):
                complete(arguments(attempt, uncertainty=[]))
            self.assertFalse((attempt / "rendered.json").exists())
            with self.assertRaisesRegex(RunError, "not available"):
                complete(arguments(attempt))


if __name__ == "__main__":
    unittest.main()
