import unittest
from agent_trace import normalize, from_workflow_report, SCHEMA_VERSION

class AgentTraceTests(unittest.TestCase):
 def test_normalizes_redacted_ordered_trace(self):
  trace=normalize({'run':{'id':'private-session','status':'ok','attributes':{'model.name':'qwen'}},'spans':[{'kind':'model','status':'ok','start_ms':0,'duration_ms':12,'attributes':{'model.name':'qwen'}},{'kind':'tool','status':'ok','start_ms':12,'duration_ms':2,'attributes':{'tool.name':'read'}}]})
  self.assertEqual(trace['schema'],SCHEMA_VERSION); self.assertNotIn('private-session',str(trace)); self.assertFalse(trace['privacy']['content_stored'])
  self.assertFalse(trace['provenance']['source_identifier_stored']); self.assertEqual(trace['provenance']['correlation'],'redacted_trace_fingerprint')
 def test_trace_correlation_does_not_derive_from_a_session_identifier(self):
  first={'run':{'id':'session-a','status':'ok'},'spans':[{'kind':'tool','status':'ok','start_ms':0,'duration_ms':1,'attributes':{'tool.name':'read'}}]}
  second={'run':{'id':'session-b','status':'ok'},'spans':[{'kind':'tool','status':'ok','start_ms':0,'duration_ms':1,'attributes':{'tool.name':'read'}}]}
  a,b=normalize(first),normalize(second)
  self.assertEqual(a['trace_id'],b['trace_id'])
  self.assertNotIn('session-a',str(a)); self.assertNotIn('session-b',str(b))
 def test_rejects_sensitive_attributes(self):
  with self.assertRaises(ValueError): normalize({'run':{'id':'a'},'spans':[{'kind':'tool','start_ms':0,'duration_ms':1,'attributes':{'command':'secret'}}]})
 def test_rejects_reversed_order(self):
  with self.assertRaises(ValueError): normalize({'run':{'id':'a'},'spans':[{'kind':'tool','start_ms':2,'duration_ms':1},{'kind':'tool','start_ms':1,'duration_ms':1}]})
 def test_adapts_existing_receipt_without_inputs(self):
  trace=from_workflow_report({'outcome':'completed','tool_calls':[{'tool':'read','state':{'status':'completed','input':{'filePath':'/secret'}}}]})
  self.assertEqual(trace['spans'][0]['attributes']['tool.name'],'read'); self.assertNotIn('/secret',str(trace))
