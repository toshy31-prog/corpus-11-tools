import tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import tool_gateway as g
class ApprovalTests(unittest.TestCase):
 def setUp(self):
  self.directory=tempfile.TemporaryDirectory();self.old=g.BASE;self.old_settings=g.SETTINGS;g.BASE=Path(self.directory.name);g.SETTINGS=g.BASE/'browser-settings.json';g.REQUESTS.clear()
 def tearDown(self):g.BASE=self.old;g.SETTINGS=self.old_settings;g.REQUESTS.clear();self.directory.cleanup()
 def test_no_execution_before_approval_and_no_replay(self):
  with patch.object(g,'execute',return_value={'title':'Test'}) as run:
   req=g.submit({'action':'snapshot'});run.assert_not_called()
   self.assertEqual(g.operate({'operation':'approve','id':req['id']})['status'],'done');run.assert_called_once()
   with self.assertRaises(ValueError):g.operate({'operation':'approve','id':req['id']})
 def test_rejection_never_executes(self):
  with patch.object(g,'execute') as run:
   req=g.submit({'action':'navigate','url':'https://example.invalid'})
   g.operate({'operation':'reject','id':req['id']});run.assert_not_called()
 def test_disable_refuses_new_requests(self):
  with patch.object(g,'execute'):
   g.operate({'operation':'settings','enabled':False})
   with self.assertRaises(ValueError):g.submit({'action':'snapshot'})
   self.assertFalse(g.preferences()['enabled'])
 def test_clear_removes_old_results(self):
  with patch.object(g,'execute',return_value={'closed':True}):
   old=g.submit({'action':'snapshot'})
   req=g.submit({'action':'clear'});g.operate({'operation':'approve','id':req['id']})
   self.assertNotIn(old['id'],g.REQUESTS)
 def test_user_channel_cannot_run_arbitrary_operations(self):
  with patch.object(g,'execute') as run:
   with self.assertRaises(ValueError):g.operate({'operation':'browser-user','arguments':{'action':'ssh'}})
   run.assert_not_called()
 def test_model_cannot_invoke_user_channel(self):
  import io,json
  handler=g.Handler.__new__(g.Handler)
  handler.rfile=io.BytesIO(json.dumps({'operation':'browser-user','arguments':{'action':'launch'}}).encode()+b'\n')
  handler.wfile=io.BytesIO()
  with patch.object(g,'execute') as run:
   handler.handle();run.assert_not_called()
  self.assertIn('error',json.loads(handler.wfile.getvalue()))
if __name__=='__main__':unittest.main()
