from __future__ import annotations

from copy import deepcopy
import unittest

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


if __name__ == "__main__":
    unittest.main()
