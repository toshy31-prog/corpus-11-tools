import copy
import json
import unittest
from pathlib import Path

from tool_redteam import RedTeamError, run

HERE = Path(__file__).resolve().parent
CATALOG = json.loads((HERE / 'tool_router_catalog_v2.json').read_text())
PROFILES = json.loads((HERE / 'tool_profiles.json').read_text())
CASES = json.loads((HERE / 'tool_redteam_cases.json').read_text())


class ToolRedTeamTests(unittest.TestCase):
    def test_all_in_memory_adversarial_cases_pass_without_execution(self):
        original_catalog = copy.deepcopy(CATALOG)
        original_profiles = copy.deepcopy(PROFILES)
        receipt = run(CATALOG, PROFILES, CASES)
        self.assertTrue(receipt['passed'])
        self.assertEqual(receipt['execution'], 'not_started')
        self.assertEqual(receipt['tools_invoked'], [])
        self.assertEqual(receipt['model_calls'], 0)
        self.assertEqual(CATALOG, original_catalog)
        self.assertEqual(PROFILES, original_profiles)
        rejected = {row['id'] for row in receipt['cases'] if row['outcome'] == 'rejected'}
        self.assertTrue({'catalog-description-poison', 'catalog-schema-escalation', 'catalog-unknown-tool', 'profile-unknown-tool', 'explicit-mask-unknown-tool'} <= rejected)

    def test_rejects_invalid_case_contract(self):
        bad = copy.deepcopy(CASES)
        bad['cases'].append(copy.deepcopy(bad['cases'][0]))
        with self.assertRaisesRegex(RedTeamError, 'invalide'):
            run(CATALOG, PROFILES, bad)


if __name__ == '__main__':
    unittest.main()
