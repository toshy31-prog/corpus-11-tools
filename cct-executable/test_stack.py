from __future__ import annotations

import unittest

from pathlib import Path
import sys

from run_all import portable_command, portable_cwd
from validate_stack import validate


class StackTests(unittest.TestCase):
    def test_static_stack_is_complete_and_bounded(self) -> None:
        self.assertEqual(validate(), [])

    def test_verification_report_paths_are_portable(self) -> None:
        self.assertEqual(portable_command([sys.executable, "-m", "unittest"]), ["python3", "-m", "unittest"])
        self.assertEqual(portable_cwd(Path(__file__).resolve().parent), "cct-executable")


if __name__ == "__main__":
    unittest.main()
