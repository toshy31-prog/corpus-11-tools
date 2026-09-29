import json
import unittest
from pathlib import Path

import artifact_footprints as footprints


SESSION = "ses_footprints_test"
TARGET = "notes/canary.md"
ABSOLUTE = (footprints.REPO_ROOT / TARGET).as_posix()


def user(message_id="u1", text="travaille normalement"):
    return {
        "info": {"id": message_id, "role": "user", "time": {"created": 1}},
        "parts": [{"type": "text", "text": text}],
    }


def assistant(parts, message_id="a1", parent="u1", completed=3):
    return {
        "info": {
            "id": message_id,
            "role": "assistant",
            "parentID": parent,
            "finish": "stop",
            "time": {"completed": completed},
        },
        "parts": parts,
    }


def tool(name, inputs, *, status="completed", call_id="call_1", output="SECRET_OUTPUT"):
    return {
        "type": "tool",
        "tool": name,
        "callID": call_id,
        "state": {
            "status": status,
            "input": inputs,
            "output": output,
            "time": {"start": 2, "end": 2.5},
        },
    }


class ArtifactFootprintsTests(unittest.TestCase):
    def analyze(self, messages):
        return footprints.analyze_messages(
            messages, session_id=SESSION, artifact_path=TARGET
        )

    def test_completed_exact_read_attests_discovery_but_not_spontaneous(self):
        result = self.analyze([
            user(),
            assistant([tool("read", {"filePath": ABSOLUTE})]),
        ])
        self.assertEqual(result["interpretation"]["discovery"], "DISCOVERY_ATTESTED")
        self.assertEqual(result["provenance"]["classification"], "INDETERMINATE")
        self.assertTrue(result["provenance"]["spontaneous_candidate"])
        self.assertFalse(result["provenance"]["spontaneous_attested"])
        self.assertEqual(
            [event["kind"] for event in result["raw_events"]],
            ["artifact_access_observed"],
        )

    def test_prior_exact_reference_derives_exposed(self):
        result = self.analyze([
            user(text="consulte " + TARGET),
            assistant([tool("read", {"filePath": ABSOLUTE})]),
        ])
        self.assertEqual(result["provenance"]["classification"], "EXPOSED")
        self.assertFalse(result["provenance"]["spontaneous_candidate"])
        self.assertEqual(
            [event["kind"] for event in result["raw_events"]],
            ["artifact_reference_observed", "artifact_access_observed"],
        )

    def test_mutation_after_read_attests_participation(self):
        result = self.analyze([
            user(),
            assistant([
                tool("read", {"filePath": ABSOLUTE}, call_id="read_1"),
                tool("edit", {
                    "filePath": ABSOLUTE,
                    "oldString": "SECRET_OLD",
                    "newString": "SECRET_NEW",
                }, call_id="edit_1"),
            ]),
        ])
        self.assertEqual(result["interpretation"]["participation"], "PARTICIPATION")
        payload = json.dumps(result)
        self.assertNotIn("SECRET_OLD", payload)
        self.assertNotIn("SECRET_NEW", payload)
        self.assertNotIn("SECRET_OUTPUT", payload)

    def test_failed_read_is_attempt_not_discovery(self):
        result = self.analyze([
            user(),
            assistant([tool("read", {"filePath": ABSOLUTE}, status="error")]),
        ])
        self.assertEqual(result["interpretation"]["discovery"], "NOT_ATTESTED")
        self.assertEqual(result["raw_events"][0]["kind"], "artifact_tool_attempt_observed")

    def test_bash_and_outputs_are_deliberately_blind(self):
        result = self.analyze([
            user(),
            assistant([
                tool("bash", {"command": "cat " + ABSOLUTE}, output=ABSOLUTE),
                tool("glob", {"pattern": "**/*.md"}, output=ABSOLUTE),
            ]),
        ])
        self.assertEqual(result["raw_events"], [])
        self.assertEqual(result["interpretation"]["discovery"], "NOT_ATTESTED")

    def test_document_extract_is_covered_exact_path_read(self):
        result = self.analyze([
            user(),
            assistant([tool("corpus-tools_document_extract", {"path": TARGET})]),
        ])
        self.assertEqual(result["interpretation"]["discovery"], "DISCOVERY_ATTESTED")

    def test_read_silent_is_never_claimed(self):
        result = self.analyze([
            user(),
            assistant([tool("read", {"filePath": ABSOLUTE})]),
        ])
        self.assertEqual(result["interpretation"]["read_silent"], "NOT_ESTABLISHED")

    def test_path_validation_fails_closed(self):
        for value in ("../x", "/absolute", ".git/config", "a\\b", "a/../b", "a/"):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    footprints.analyze_messages([], session_id=SESSION, artifact_path=value)

    def test_observe_session_performs_get_only_and_returns_no_content(self):
        calls = []
        messages = [
            user(text="SECRET_PROMPT " + TARGET),
            assistant([tool("read", {"filePath": ABSOLUTE}, output="SECRET_TOOL_OUTPUT")]),
        ]

        def request(method, path, body, directory):
            calls.append((method, path, body, directory))
            if path == "/session/" + SESSION:
                return {"id": SESSION}
            if path == "/session/" + SESSION + "/message":
                return messages
            raise AssertionError(path)

        result = footprints.observe_session(
            session_id=SESSION,
            artifact_path=TARGET,
            request=request,
        )
        self.assertTrue(calls)
        self.assertTrue(all(method == "GET" and body is None for method, _, body, _ in calls))
        payload = json.dumps(result)
        self.assertNotIn("SECRET_PROMPT", payload)
        self.assertNotIn("SECRET_TOOL_OUTPUT", payload)

    def test_mcp_surface_is_external_only_and_bounded(self):
        source = Path(__file__).with_name("corpus_gpt_mcp.py").read_text(encoding="utf-8")
        self.assertIn("import artifact_footprints", source)
        self.assertIn('"name":"artifact_footprints"', source)
        block_start = source.index('if name == "artifact_footprints":')
        block_end = source.index('if name == "local_task":', block_start)
        block = source[block_start:block_end]
        self.assertIn("_local_task_client_allowed()", block)
        self.assertIn("artifact_footprints.observe_session(", block)
        for forbidden in ("prompt_async", "submit_local_task(", "start_job(", "run_job("):
            self.assertNotIn(forbidden, block)


if __name__ == "__main__":
    unittest.main()
