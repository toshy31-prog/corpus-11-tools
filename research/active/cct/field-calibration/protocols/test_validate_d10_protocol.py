from __future__ import annotations

import unittest

from validate_d10_protocol import validate


class D10ProtocolTests(unittest.TestCase):
    def test_protocol_is_statically_coherent_and_bounded(self) -> None:
        self.assertEqual(validate(), [])


if __name__ == "__main__":
    unittest.main()
