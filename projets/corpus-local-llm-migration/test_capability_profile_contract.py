import json
import copy
import unittest
from pathlib import Path

from capability_profile_contract import selection_receipt

HERE = Path(__file__).resolve().parent
CATALOG = json.loads((HERE / 'tool_router_catalog_v2.json').read_text())
PROFILES = json.loads((HERE / 'tool_profiles.json').read_text())


class CapabilityProfileContractTests(unittest.TestCase):
    def test_resume_profiles_cover_required_namespaces_without_granting_permission(self):
        receipt = selection_receipt('resume-check', PROFILES, CATALOG)
        self.assertEqual(receipt['selection']['namespaces'], ['files', 'memory', 'shell'])
        self.assertEqual(receipt['selection']['tools'], ['bash', 'corpus-retrieval_memory_search', 'read'])
        self.assertEqual(receipt['permission'], 'unchanged_not_evaluated')
        self.assertEqual(receipt['execution'], 'not_started')
        self.assertEqual(receipt['risk']['maximum'], 'high')

    def test_resume_work_only_adds_the_minimum_edit_capability(self):
        check = selection_receipt('resume-check', PROFILES, CATALOG)
        work = selection_receipt('resume-work', PROFILES, CATALOG)
        self.assertEqual(set(work['selection']['tools']) - set(check['selection']['tools']), {'edit'})
        self.assertNotIn('write', work['selection']['tools'])

    def test_document_media_profile_does_not_expose_generation(self):
        receipt = selection_receipt('document-media', PROFILES, CATALOG)
        self.assertEqual(receipt['selection']['namespaces'], ['documents', 'media'])
        self.assertNotIn('corpus-tools_media_generate', receipt['selection']['tools'])
        self.assertEqual(receipt['risk']['maximum'], 'medium')

    def test_unknown_profile_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'inconnu'):
            selection_receipt('everything', PROFILES, CATALOG)

    def test_transitive_dependency_cannot_hide_risk_or_confirmation_requirement(self):
        catalog = copy.deepcopy(CATALOG)
        catalog['tools']['read']['dependencies'] = ['bash']
        receipt = selection_receipt('read', PROFILES, catalog)
        self.assertEqual(receipt['selection']['tools'], ['read'])
        self.assertEqual(receipt['selection']['resolved_tools'], ['bash', 'read'])
        self.assertEqual(receipt['selection']['dependencies_added'], ['bash'])
        self.assertEqual(receipt['risk']['maximum'], 'high')
        self.assertTrue(receipt['risk']['explicit_execution_authorization_required'])

    def test_unknown_or_cyclic_dependency_is_rejected(self):
        catalog = copy.deepcopy(CATALOG)
        catalog['tools']['read']['dependencies'] = ['not-in-catalog']
        with self.assertRaisesRegex(ValueError, 'inconnue'):
            selection_receipt('read', PROFILES, catalog)
        catalog = copy.deepcopy(CATALOG)
        catalog['tools']['read']['dependencies'] = ['glob']
        catalog['tools']['glob']['dependencies'] = ['read']
        with self.assertRaisesRegex(ValueError, 'Cycle'):
            selection_receipt('read', PROFILES, catalog)


if __name__ == '__main__':
    unittest.main()

class ScenarioCoverageTests(unittest.TestCase):
    def test_c12_c18_c24_have_bounded_profiles(self):
        from tool_context_quality import audit
        scenarios = json.loads((HERE / 'SCENARIOS.json').read_text())
        links = json.loads((HERE / 'TOOL_SCENARIO_LINKS.json').read_text())
        report = audit(CATALOG, PROFILES, scenarios, links)
        rows = {row['scenario_id']: row for row in report['scenario_coverage']}
        for ident in ('C12', 'C18', 'C24'):
            self.assertFalse(rows[ident]['profile_gap'])
        self.assertIn('resume-check', rows['C12']['matching_profiles'])
        self.assertIn('document-media', rows['C18']['matching_profiles'])
        self.assertFalse(any(item.startswith('scenario_profile_gap:') for item in report['review_items']))
