from __future__ import annotations

import unittest

from validate_stack import validate


class StackTests(unittest.TestCase):
    def test_static_stack_is_complete_and_bounded(self) -> None:
        self.assertEqual(validate(), [])


if __name__ == "__main__":
    unittest.main()
