import json,sqlite3,tempfile,unittest
from pathlib import Path
from datetime import datetime,timedelta
from unittest.mock import patch
from local_statistics import aggregate,TZ
from comparable_measurement import SCHEMA
import prefix_cache_telemetry as telemetry
class StatisticsTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.db=Path(self.temp.name)/'stats.db';self.now=datetime(2026,9,23,12,tzinfo=TZ)
  self.c=sqlite3.connect(self.db)
  self.c.executescript('create table session(id text);create table message(id text,time_created integer,data text);create table part(time_created integer,data text);insert into session values ("s");')
 def tearDown(self):self.c.close();self.temp.cleanup()
 def message(self,id,data,ago=0):
  self.c.execute('insert into message values(?,?,?)',(id,int((self.now-timedelta(days=ago)).timestamp()*1000),json.dumps(data)));self.c.commit()
 def part(self,data):
  self.c.execute('insert into part values(?,?)',(int(self.now.timestamp()*1000),json.dumps(data)));self.c.commit()
 def test_steps_not_double_counted_as_turns_or_tokens(self):
  for id in ('a','b'):self.message(id,{'role':'assistant','parentID':'user1','modelID':'local','tokens':{'input':10,'output':2,'reasoning':2,'cache':{'read':99}}})
  self.part({'type':'step-finish','tokens':{'input':20,'output':4}})
  result=aggregate(db=self.db,now=self.now)
  self.assertEqual(sum(result['metrics']['turns']['local']),1)
  self.assertEqual(sum(result['metrics']['tokens']['local']),24)
  self.assertEqual(sum(result['metrics']['cache_read']['local']),198)
  self.assertEqual(result['counters']['cache_read_reported'],198)
  self.assertEqual(result['counters']['cache_read_messages'],2)
  self.assertEqual(result['counters']['cache_write_reported'],0)
 def test_period_and_missing_tokens(self):
  self.message('old',{'role':'assistant','tokens':{'input':99}},ago=10)
  self.message('now',{'role':'assistant','tokens':{'input':0,'output':0}})
  short=aggregate(7,self.db,self.now);long=aggregate(30,self.db,self.now)
  self.assertEqual(short['counters']['assistant_messages'],1)
  self.assertEqual(long['counters']['assistant_messages'],2)
  self.assertEqual(short['counters']['tokens_missing'],1)
  self.assertEqual(len(short['dates']),7)
 def test_successful_tools_and_method_reads_only(self):
  for status in ['completed','error','running']:
   self.part({'type':'tool','tool':'corpus_plugin_read','state':{'status':status,'input':{'path':'skills/routing/SKILL.md'}}})
  self.part({'type':'text','text':'private content'})
  result=aggregate(db=self.db,now=self.now)
  self.assertEqual(sum(result['metrics']['tools']['corpus_plugin_read']),1)
  self.assertEqual(sum(result['metrics']['skills']['routing']),1)
  self.assertNotIn('private content',json.dumps(result))
 def test_agent_reliability_uses_only_the_last_assistant_state_per_turn(self):
  completed={'role':'assistant','parentID':'normal','time':{'completed':1}}
  interrupted={'role':'assistant','parentID':'broken','time':{'completed':1},'error':{'name':'aborted','data':{'message':'secret'}}}
  incomplete={'role':'assistant','parentID':'pending','time':{}}
  # An earlier failure followed by a terminal normal step is one observed normal turn.
  recovered={'role':'assistant','parentID':'normal','time':{'completed':1},'finish':'unknown'}
  self.message('first',recovered,ago=1);self.message('last',completed)
  self.message('broken',interrupted);self.message('pending',incomplete)
  result=aggregate(db=self.db,now=self.now)
  counters=result['counters']
  self.assertEqual(counters['agent_turns_observed'],3)
  self.assertEqual(counters['agent_turns_normal'],1)
  self.assertEqual(counters['agent_turns_interrupted_or_error'],1)
  self.assertEqual(counters['agent_turns_incomplete'],1)
  self.assertNotIn('parentID',json.dumps(result))
  self.assertEqual(result['failure_causes'],{'error:aborted':1,'incomplete':1})
  self.assertNotIn('secret',json.dumps(result))
 def test_no_database_created_and_bad_period(self):
  missing=Path(self.temp.name)/'absent.db'
  with self.assertRaises(sqlite3.Error):aggregate(db=missing,now=self.now)
  self.assertFalse(missing.exists())
  with self.assertRaises(ValueError):aggregate(365,self.db,self.now)
 def test_e2e_summary_exposes_timings_not_transcript(self):
  receipt=Path(self.temp.name)/'receipt.json'
  receipt.write_text(json.dumps({'messages':[
   {'info':{'id':'user','role':'user','time':{'created':1_000_000_000_000}}},
   {'info':{'role':'assistant','parentID':'user','time':{'created':1_000_000_000_100,'completed':1_000_000_002_100}},'parts':[]},
  ]}))
  with patch('local_statistics.E2E_RECEIPT',receipt):result=aggregate(db=self.db,now=self.now)
  self.assertTrue(result['e2e']['available'])
  self.assertEqual(result['e2e']['timing']['wall_seconds_from_transcript'],2.1)
  self.assertNotIn('messages',json.dumps(result['e2e']))
  self.assertEqual(result['e2e']['validation']['state'],'incomplete_local_receipt')
 def test_comparable_measurement_status_is_safe_and_read_only(self):
  from local_statistics import comparable_measurement_status
  reference=Path(self.temp.name)/'reference.json';candidate=Path(self.temp.name)/'candidate.json'
  self.assertEqual(comparable_measurement_status(reference,candidate)['state'],'ready')
  h='a'*64
  value={'schema':SCHEMA,'model':{'provider_id':'corpus-local','model_id':'qwen','quantization':'q4','model_sha256':h},'runtime':{'engine':'llama','engine_version':'v1','context_tokens':1,'configuration_sha256':h},'gpu':{'backend':'cuda','accelerator_fingerprint_sha256':h,'vram_mib':1},'cache':{'state_before':'warm','prefix_identity_sha256':h,'reported_read_tokens':0},'task':{'prompt_sha256':h,'fixture_sha256':h,'tool_profile_sha256':h,'verifier_contract_sha256':h},'outcome':{'terminal':'completed','verification':'receipt_chain_verified','wall_seconds':1,'tool_sequence':[]}}
  reference.write_text(json.dumps(value));observed=comparable_measurement_status(reference,candidate)
  self.assertEqual(observed['state'],'observed');self.assertNotIn('prompt_sha256',json.dumps(observed))
  value['cache']['state_before']='cold';candidate.write_text(json.dumps(value))
  self.assertEqual(comparable_measurement_status(reference,candidate)['state'],'not_comparable')
 def test_prefix_cache_summary_is_aggregate_only(self):
  cache=Path(self.temp.name)/'prefix-cache.json';telemetry._SESSIONS.clear()
  body=json.dumps({'agent':'corpus','model':{'providerID':'local','modelID':'qwen'},'system':'secret system','parts':[{'type':'text','text':'secret prompt'}]}).encode()
  with patch('prefix_cache_telemetry.FILE',cache):
   telemetry.observe('private-session',body)
   result=aggregate(db=self.db,now=self.now)
  serialized=json.dumps(result['prefix_cache'])
  self.assertIn('prefix_cache',result)
  self.assertNotIn('secret system',serialized);self.assertNotIn('secret prompt',serialized);self.assertNotIn('private-session',serialized)
  self.assertEqual(result['prefix_cache']['counters']['actual_cache_hits_observed'],0)
  self.assertEqual(result['cache_experiment_admission']['decision'],'defer_qwen_experiment')
  self.assertFalse(result['cache_experiment_admission']['writes_performed'])
  evidence=result['evidence_overview']
  self.assertEqual(evidence['counts']['verified'],1 if result['e2e']['validation']['state']=='verified_local_receipt' else 0)
  self.assertGreaterEqual(evidence['counts']['deferred'],1)
  self.assertGreaterEqual(evidence['counts']['unknown'],1)
  self.assertEqual(evidence['counts']['rejected'],0)
if __name__=='__main__':unittest.main()
