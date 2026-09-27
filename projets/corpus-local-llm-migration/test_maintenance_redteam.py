import copy
import json
import unittest
from pathlib import Path

from maintenance_redteam import run

HERE = Path(__file__).resolve().parent
CASES = json.loads((HERE / 'maintenance_redteam_cases.json').read_text())


class MaintenanceRedTeamTests(unittest.TestCase):
    def test_adversarial_maintenance_contract_cases_are_contained(self):
        original = copy.deepcopy(CASES)
        receipt = run(CASES)
        self.assertTrue(receipt['passed'])
        self.assertEqual(receipt['execution'], 'not_started')
        self.assertFalse(receipt['writes_performed'])
        self.assertEqual(receipt['model_calls'], 0)
        self.assertEqual(CASES, original)
        self.assertEqual({row['outcome'] for row in receipt['cases']}, {'rejected', 'not_verified'})

    def test_invalid_case_contract_is_rejected(self):
        bad = copy.deepcopy(CASES)
        bad['cases'][0]['expected'] = 'verified'
        with self.assertRaisesRegex(ValueError, 'Attente'):
            run(bad)


if __name__ == '__main__':
    unittest.main()
