import json
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch
import scheduled_messages as scheduler
import local_shares as shares

class ConsolidationTests(unittest.TestCase):
    def test_scheduler_retry_and_cancel(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(scheduler,'DB',Path(tmp)/'jobs.db'), patch('chat_actions.project',return_value='/tmp/project'):
            request={'action':'create','id':'repeatable-test','session':'ses_test','directory':'/tmp/project','text':'hello','at':time.time()*1000+60000}
            scheduler.operate(request)
            self.assertEqual(len(scheduler.operate(request)['jobs']),1)
            with self.assertRaises(ValueError): scheduler.operate(dict(request,text='changed'))
            scheduler.operate({'action':'cancel','id':request['id']})
            with scheduler.connect() as db: db.execute('UPDATE jobs SET at=0')
            with patch('urllib.request.urlopen') as send:
                scheduler.tick();send.assert_not_called()

    def test_scheduler_persists_and_claims_once(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(scheduler,'DB',Path(tmp)/'jobs.db'), patch('chat_actions.project',return_value='/tmp/project'):
            data=scheduler.operate({'action':'create','session':'ses_test','directory':'/tmp/project','text':'hello','at':time.time()*1000+1000})
            job=data['jobs'][0]
            with scheduler.connect() as db: db.execute('UPDATE jobs SET at=0')
            class Reply:
                def __enter__(self): return self
                def __exit__(self,*a): pass
                def read(self,*a): return b'{}'
            with patch('urllib.request.urlopen',return_value=Reply()) as send:
                scheduler.tick();scheduler.tick()
                self.assertEqual(send.call_count,2)
            self.assertEqual(scheduler.operate({})['jobs'][0]['state'],'delivered')

    def test_uncertain_send_is_not_replayed(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(scheduler,'DB',Path(tmp)/'jobs.db'), patch('chat_actions.project',return_value='/tmp/project'):
            scheduler.operate({'action':'create','session':'ses_test','directory':'/tmp/project','text':'hello','at':time.time()*1000+1000})
            with scheduler.connect() as db: db.execute('UPDATE jobs SET at=0')
            from io import BytesIO
            with patch('urllib.request.urlopen',side_effect=[BytesIO(b'{}'),OSError('timeout')]) as send:
                scheduler.tick();scheduler.tick();self.assertEqual(send.call_count,2)
            self.assertEqual(scheduler.operate({})['jobs'][0]['state'],'uncertain')

    def test_share_escaped_and_revocable(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(shares,'BASE',Path(tmp)):
            result=shares.operate({'action':'create','title':'<script>','text':'<img onerror="bad">'})
            page=shares.page(result['token'])
            self.assertIn(b'&lt;img',page);self.assertNotIn(b'<script>',page)
            shares.operate({'action':'revoke','token':result['token']})
            self.assertIsNone(shares.page(result['token']))
            self.assertIsNone(shares.page('../../private'))

class FileAndGitTests(unittest.TestCase):
    def test_file_confined_to_project(self):
        import chat_actions
        with tempfile.TemporaryDirectory() as tmp, patch('chat_actions.project',return_value=tmp):
            (Path(tmp)/'hello.txt').write_text('bonjour')
            result=chat_actions.operate({'action':'file','path':'hello.txt'})
            self.assertEqual(result['mime'],'text/plain')
            with self.assertRaises(ValueError): chat_actions.operate({'action':'file','path':'../outside'})
            with self.assertRaises(ValueError): chat_actions.operate({'action':'file','path':'.git/config'})
    def test_git_write_requires_confirmation(self):
        import chat_actions
        with patch('chat_actions.project',return_value='/tmp'):
            for action in ('switch','commit','push'):
                with self.assertRaises(ValueError): chat_actions.operate({'action':action})
