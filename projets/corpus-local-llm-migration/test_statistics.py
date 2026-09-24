import json,sqlite3,tempfile,unittest
from pathlib import Path
from datetime import datetime,timedelta
from local_statistics import aggregate,TZ
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
 def test_no_database_created_and_bad_period(self):
  missing=Path(self.temp.name)/'absent.db'
  with self.assertRaises(sqlite3.Error):aggregate(db=missing,now=self.now)
  self.assertFalse(missing.exists())
  with self.assertRaises(ValueError):aggregate(365,self.db,self.now)
if __name__=='__main__':unittest.main()
