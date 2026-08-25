from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / "runtime" / "corpus_runtime.py"


def invoke(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["python3", str(RUNTIME), *args], cwd=ROOT, text=True,
                          capture_output=True, check=False)


class RuntimeTests(unittest.TestCase):
    def test_lists_declared_capabilities(self) -> None:
        response = invoke("list")
        self.assertEqual(response.returncode, 0, response.stderr)
        payload = json.loads(response.stdout)
        self.assertEqual({item["id"] for item in payload["capabilities"]},
                         {"workspace.status", "workspace.search", "workspace.verify"})

    def test_search_rejects_unknown_arguments(self) -> None:
        response = invoke("run", "workspace.search", "--arguments", '{"query":"x","shell":"bad"}')
        self.assertNotEqual(response.returncode, 0)
        self.assertIn("Unsupported arguments", response.stderr)

    def test_search_cannot_escape_workspace(self) -> None:
        response = invoke("run", "workspace.search", "--arguments", '{"query":"x","path":".."}')
        self.assertNotEqual(response.returncode, 0)
        self.assertIn("Path must stay inside the workspace", response.stderr)

    def test_execute_requires_explicit_approval(self) -> None:
        response = invoke("run", "workspace.verify")
        self.assertNotEqual(response.returncode, 0)
        self.assertIn("requires --approve-execution", response.stderr)

    def test_plan_rejects_arbitrary_command_shape(self) -> None:
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as handle:
            json.dump({"steps": [{"command": "rm -rf"}]}, handle)
            plan_path = handle.name
        try:
            response = invoke("run-plan", plan_path)
        finally:
            Path(plan_path).unlink()
        self.assertNotEqual(response.returncode, 0)
        self.assertIn("Invalid plan step", response.stderr)

    def test_plan_preflights_execution_approval(self) -> None:
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as handle:
            json.dump({"steps": [{"capability": "workspace.status"},
                                  {"capability": "workspace.verify"}]}, handle)
            plan_path = handle.name
        try:
            response = invoke("run-plan", plan_path)
        finally:
            Path(plan_path).unlink()
        self.assertNotEqual(response.returncode, 0)
        self.assertIn("before anything runs", response.stderr)

    def test_missing_plan_has_a_bounded_error(self) -> None:
        response = invoke("inspect-plan", "runtime/examples/absent.json")
        self.assertNotEqual(response.returncode, 0)
        self.assertIn("Plan file not found", response.stderr)
        self.assertNotIn("Traceback", response.stderr)

    def test_mcp_lists_tools(self) -> None:
        server = ROOT / "runtime" / "mcp_server.py"
        request = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}) + "\n"
        response = subprocess.run(["python3", str(server)], cwd=ROOT, input=request, text=True,
                                  capture_output=True, check=False)
        self.assertEqual(response.returncode, 0, response.stderr)
        payload = json.loads(response.stdout)
        self.assertEqual(payload["result"]["tools"][0]["name"], "corpus_runtime_list_capabilities")


if __name__ == "__main__":
    unittest.main()
