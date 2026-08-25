from __future__ import annotations

import unittest

from pathlib import Path
import subprocess
import sys

from run_all import CHECKS, portable_command, portable_cwd
from validate_stack import validate


class StackTests(unittest.TestCase):
    def test_static_stack_is_complete_and_bounded(self) -> None:
        self.assertEqual(validate(), [])

    def test_verification_report_paths_are_portable(self) -> None:
        self.assertEqual(portable_command([sys.executable, "-m", "unittest"]), ["python3", "-m", "unittest"])
        self.assertEqual(portable_cwd(Path(__file__).resolve().parent), "executable")

    def test_field_calibration_preparation_is_part_of_the_local_stack(self) -> None:
        check = next((item for item in CHECKS if item["id"] == "field_calibration_d10"), None)
        self.assertIsNotNone(check)
        completed = subprocess.run(
            check["cmd"], cwd=check["cwd"], text=True,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False,
        )
        self.assertEqual(completed.returncode, check["expected"], completed.stdout)


if __name__ == "__main__":
    unittest.main()
