import unittest
from scenario_evaluation import validate_bank, evaluate_submission, evaluation_catalog, response

BANK={'scenarios':[{'id':'C01','title':'x','context':'x','turns':[],'expected':[],'failures':[],'areas':[],'status':'not_run','evidence':[],'user_feedback':'not_observed'}]}
class ScenarioEvaluationTests(unittest.TestCase):
 def test_validates_descriptive_bank_without_execution(self):
  value=validate_bank(BANK); self.assertTrue(value['bank_valid']); self.assertEqual(value['execution'],'not_performed')
 def test_submission_stays_offline_and_redacted(self):
  value=evaluate_submission(BANK,{'scenario_id':'C01','verdict':'inconclusive','trace':{'run':{'id':'secret-session'},'spans':[]}})
  self.assertEqual(value['verdict'],'inconclusive'); self.assertNotIn('secret-session',str(value)); self.assertEqual(value['execution'],'not_performed')
 def test_invalid_status_is_rejected(self):
  bad={'scenarios':[dict(BANK['scenarios'][0],status='running')]}; self.assertFalse(validate_bank(bad)['bank_valid'])
 def test_catalog_describes_cases_without_execution(self):
  import json, tempfile
  with tempfile.TemporaryDirectory() as directory:
   from pathlib import Path
   bank=Path(directory)/'bank.json'; bank.write_text(json.dumps(BANK),encoding='utf-8')
   links=Path(directory)/'links.json'; links.write_text(json.dumps({'schema_version':1,'links':[],'not_applicable':['C01']}),encoding='utf-8')
   value=evaluation_catalog(bank,Path(directory)/'missing-fixtures.json',links)
  self.assertEqual(value['execution'],'not_performed')
  self.assertEqual(value['scenarios'][0]['id'],'C01')
  self.assertEqual(value['scenarios'][0]['fixture_status'],'not_materialized')
  self.assertEqual(value['grader']['status'],'ready_without_recorded_submission')
  self.assertFalse(value['scenarios'][0]['grader_applicable'])
  self.assertEqual(value['scenarios'][0]['capability_status'],'not_applicable')
  self.assertEqual(value['scenarios'][0]['matching_profiles'],[])
 def test_catalog_endpoint_refuses_writes(self):
  value=response('POST',b'{}')
  self.assertIn(b'405 Method Not Allowed',value)

from scenario_evaluation import freeze_fixtures, validate_fixtures, assess_fixture_submission

class ScenarioFixtureTests(unittest.TestCase):
 def test_frozen_fixtures_cover_source_bank_with_hashes_and_no_results(self):
  fixtures=freeze_fixtures(BANK)
  gate=validate_fixtures(BANK,fixtures)
  self.assertTrue(gate['fixtures_valid'])
  row=fixtures['fixtures'][0]
  self.assertEqual(row['fixture_status'],'frozen_not_executed')
  self.assertIsNone(row['declared_result']);self.assertIsNone(row['verified_result'])
 def test_source_or_case_change_invalidates_frozen_fixture(self):
  fixtures=freeze_fixtures(BANK)
  changed={'scenarios':[dict(BANK['scenarios'][0],context='changed')]}
  gate=validate_fixtures(changed,fixtures)
  self.assertFalse(gate['fixtures_valid'])
  self.assertIn('source_bank_sha256_mismatch',gate['fixture_errors'])
 def test_declared_submission_never_becomes_verified_success(self):
  fixtures=freeze_fixtures(BANK);fixture=fixtures['fixtures'][0]
  result=assess_fixture_submission(BANK,fixtures,{
   'fixture_id':'C01','fixture_sha256':fixture['scenario_sha256'],'declared_result':'pass',
   'trace':{'run':{'id':'private-run'},'spans':[]},
   'evidence':{'reported_verification':'reported_local_verification','receipt_sha256':'a'*64},
  })
  self.assertEqual(result['declared_result'],'pass')
  self.assertIsNone(result['verified_result'])
  self.assertEqual(result['promotion'],'not_performed')
  self.assertNotIn('private-run',str(result))
