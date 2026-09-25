from __future__ import annotations

from copy import deepcopy
import unittest
import io
from contextlib import redirect_stdout, redirect_stderr
from unittest.mock import patch

import portfolio_cycle


class PortfolioCycleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.projects = portfolio_cycle.load_manifest()

    def test_current_manifest_is_valid_and_complete(self) -> None:
        self.assertEqual(portfolio_cycle.manifest_errors(self.projects), [])
        expected = {str(project["path"]) for project in self.projects}
        actual = {
            str(state.parent.parent.relative_to(portfolio_cycle.RESEARCH))
            for state in (portfolio_cycle.RESEARCH / "active").rglob("state/current_state.md")
            if (state.parent.parent / "README.md").is_file()
        }
        self.assertEqual(actual, expected)

    def test_duplicate_ids_and_paths_are_rejected(self) -> None:
        projects = deepcopy(self.projects)
        projects.append(deepcopy(projects[0]))
        errors = portfolio_cycle.manifest_errors(projects)
        self.assertTrue(any("duplicate id" in error for error in errors))
        self.assertTrue(any("duplicate path" in error for error in errors))

    def test_paths_cannot_escape_active_research(self) -> None:
        projects = deepcopy(self.projects)
        projects[0]["path"] = "active/../sources"
        self.assertTrue(
            any("path must stay below" in error for error in portfolio_cycle.manifest_errors(projects))
        )

    def test_scope_and_safe_check_vocabularies_are_closed(self) -> None:
        projects = deepcopy(self.projects)
        projects[0]["synthetic_scope"] = "external_equivalent"
        projects[0]["safe_checks"] = ["undeclared_check"]
        errors = portfolio_cycle.manifest_errors(projects)
        self.assertTrue(any("unsupported synthetic_scope" in error for error in errors))
        self.assertTrue(any("unknown safe checks" in error for error in errors))

    def test_non_object_entries_are_rejected(self) -> None:
        errors = portfolio_cycle.manifest_errors([*self.projects, "not-a-project"])
        self.assertTrue(any("project entry must be an object" in error for error in errors))

    def test_cli_selection_deduplicates_and_limits_checks_and_records(self) -> None:
        ids = [project["id"] for project in self.projects[:2]]
        args = ["portfolio_cycle.py", "--record", "--tree"]
        for name in [ids[1], ids[0], ids[1]]:
            args += ["--project", name]
        with patch("sys.argv", args), redirect_stdout(io.StringIO()), \
             patch.object(portfolio_cycle, "structural_errors", return_value=[]) as structural, \
             patch.object(portfolio_cycle, "run_safe_checks", return_value=True) as checks, \
             patch.object(portfolio_cycle, "record_routine") as record, \
             patch.object(portfolio_cycle, "show_tree") as tree:
            self.assertEqual(portfolio_cycle.main(), 0)
            selected = self.projects[:2]
            checks.assert_called_once_with(selected)
            record.assert_called_once_with(selected)
            tree.assert_called_once_with(selected)
            self.assertEqual([call.args[0] for call in structural.call_args_list], selected)

    def test_unknown_cli_id_never_executes_or_records(self) -> None:
        with patch("sys.argv", ["portfolio_cycle.py", "--record", "--project", "not-a-project"]), \
             redirect_stderr(io.StringIO()), patch.object(portfolio_cycle, "run_safe_checks") as checks, \
             patch.object(portfolio_cycle, "record_routine") as record:
            with self.assertRaises(SystemExit) as error:
                portfolio_cycle.main()
            self.assertEqual(error.exception.code, 2)
            checks.assert_not_called()
            record.assert_not_called()

    def test_no_selection_keeps_all_projects(self) -> None:
        with patch("sys.argv", ["portfolio_cycle.py", "--run-safe-checks"]), \
             patch.object(portfolio_cycle, "run_safe_checks", return_value=True) as checks:
            self.assertEqual(portfolio_cycle.main(), 0)
            checks.assert_called_once_with(self.projects)

    def test_selection_cannot_hide_invalid_global_manifest(self) -> None:
        projects = deepcopy(self.projects)
        projects[-1]["safe_checks"] = ["undeclared"]
        with patch("sys.argv", ["portfolio_cycle.py", "--run-safe-checks", "--project", projects[0]["id"]]), \
             patch.object(portfolio_cycle, "load_manifest", return_value=projects), \
             redirect_stdout(io.StringIO()), patch.object(portfolio_cycle, "run_safe_checks") as checks:
            self.assertEqual(portfolio_cycle.main(), 1)
            checks.assert_not_called()


if __name__ == "__main__":
    unittest.main()
