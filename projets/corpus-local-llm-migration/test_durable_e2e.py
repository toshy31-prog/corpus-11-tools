import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import durable_e2e
import launch_durable_e2e


class DurableRunnerTests(unittest.TestCase):
    def test_records_submission_once_until_completed(self):
        calls=[]; polls=iter([
            [{'info': {'id':'user','role':'user'}}, {'info': {'role':'assistant','parentID':'user'}}],
            [{'info': {'id':'user','role':'user'}}, {'info': {'role':'assistant','parentID':'user','finish':'stop','time':{'completed':1}}}],
        ])
        def request(method,path,body,directory):
            calls.append((method,path,body,directory))
            if path=='/session': return {'id':'ses_test'}
            if path.endswith('/message'): return next(polls)
            return {}
        with tempfile.TemporaryDirectory() as tmp:
            result=durable_e2e.run(request, {'parts':[]}, Path(tmp)/'result.json', title='test', directory='/Corpus', deadline=10, poll_delay=0, clock=iter([0,1,2]).__next__, sleep=lambda _:None)
            saved=json.loads((Path(tmp)/'result.json').read_text())
        self.assertEqual(result['state'],'completed'); self.assertEqual(saved['session_id'],'ses_test')
        self.assertEqual(sum(path.endswith('/prompt_async') for _,path,_,_ in calls),1)
        self.assertFalse(any(path.endswith('/abort') for _,path,_,_ in calls))

    def test_uncertain_submission_is_never_repeated(self):
        calls=[]
        def request(method,path,body,directory):
            calls.append((method,path,body,directory))
            if path=='/session': return {'id':'ses_test'}
            if path.endswith('/prompt_async'): raise OSError('connexion coupée')
            if path.endswith('/message'):
                return [{'info': {'id':'user','role':'user'}}, {'info': {'role':'assistant','parentID':'user','finish':'stop','time':{'completed':1}}}]
            return {}
        with tempfile.TemporaryDirectory() as tmp:
            result=durable_e2e.run(request, {'parts':[]}, Path(tmp)/'result.json', title='test', directory='/Corpus', deadline=10, poll_delay=0, clock=iter([0,1]).__next__, sleep=lambda _:None)
        self.assertEqual(result['state'],'completed')
        self.assertEqual(sum(path.endswith('/prompt_async') for _,path,_,_ in calls),1)
        self.assertEqual(result['errors'][0]['phase'],'submit_prompt')

    def test_deadline_aborts_once_and_preserves_poll_error(self):
        calls=[]
        def request(method,path,body,directory):
            calls.append((method,path,body,directory))
            if path=='/session': return {'id':'ses_test'}
            if path.endswith('/message'): raise OSError('temporairement indisponible')
            return {}
        with tempfile.TemporaryDirectory() as tmp:
            result=durable_e2e.run(request, {'parts':[]}, Path(tmp)/'result.json', title='test', directory='/Corpus', deadline=2, poll_delay=0, clock=iter([0,1,3]).__next__, sleep=lambda _:None)
        self.assertEqual(result['state'],'deadline')
        self.assertTrue(any(e['phase']=='poll_messages' for e in result['errors']))
        self.assertEqual(sum(path.endswith('/prompt_async') for _,path,_,_ in calls),1)
        self.assertEqual(sum(path.endswith('/abort') for _,path,_,_ in calls),1)

    def test_local_request_rejects_non_local_endpoint(self):
        with self.assertRaisesRegex(ValueError, '127.0.0.1'):
            durable_e2e.local_request('https://example.com')

    def test_async_204_is_an_acknowledgement(self):
        class Response:
            status=204
            def read(self, limit): return b''
            def __enter__(self): return self
            def __exit__(self, *args): return False
        with patch('durable_e2e.urllib.request.urlopen', return_value=Response()):
            request=durable_e2e.local_request('http://127.0.0.1:18743')
            self.assertEqual(request('POST','/session/test/prompt_async',{'parts':[]},'/Corpus'), {})

    def test_agent_report_keeps_only_last_direct_turn(self):
        messages=[
            {'info': {'id':'old','role':'user'}},
            {'info': {'role':'assistant','parentID':'old','finish':'stop','time':{'completed':1}}, 'parts':[{'type':'tool','tool':'edit','state':{'status':'completed'}}]},
            {'info': {'id':'new','role':'user'}},
            {'info': {'role':'assistant','parentID':'new','finish':'stop','time':{'completed':2}}, 'parts':[{'type':'tool','tool':'bash','state':{'status':'completed'}}]},
        ]
        self.assertEqual(durable_e2e.agent_report(messages), {'outcome':'completed','tool_calls':[{'tool':'bash','state':{'status':'completed'}}]})

    def test_launcher_constructs_a_detached_single_runner(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); message=root/'message.json'; result=root/'result.json'
            message.write_text(json.dumps({'parts': [], 'tools': {}}))
            calls=[]
            code=launch_durable_e2e.main(['--message',str(message),'--result',str(result),'--directory',str(root)], run=lambda cmd,check: calls.append((cmd,check)))
        self.assertEqual(code,0); command,check=calls[0]
        self.assertTrue(check); self.assertEqual(command[:4],['systemd-run','--user','--collect','--quiet'])
        self.assertEqual(command.count('--message'),1); self.assertEqual(command.count('--result'),1)
        self.assertTrue(Path(command[command.index('--message')+1]).is_absolute())
        self.assertTrue(Path(command[command.index('--result')+1]).is_absolute())
