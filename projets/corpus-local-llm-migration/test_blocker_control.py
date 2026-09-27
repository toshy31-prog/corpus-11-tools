import io
import json
import unittest
from unittest.mock import patch

import corpus_control


class BlockerControlTests(unittest.TestCase):
    def test_control_plane_exposes_blocker_classifier(self):
        payload = json.dumps({"message": "McpServerError: Session terminated"})
        with patch("sys.stdin", io.StringIO(payload)), patch("sys.stdout", new_callable=io.StringIO) as out:
            self.assertEqual(corpus_control.main(["blocker", "-"]), 0)
        result = json.loads(out.getvalue())
        self.assertEqual(result["blocker"], "transport_failure")
        self.assertEqual(result["policy"]["first_action"], "inspect_transport_and_runner_state")


if __name__ == "__main__":
    unittest.main()
