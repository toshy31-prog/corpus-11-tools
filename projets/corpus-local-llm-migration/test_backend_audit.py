"""Regression cases from the September 23 audit; isolated files and no inference."""
import base64
from concurrent.futures import ThreadPoolExecutor
import io
import json
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch

import chat_actions
import corpus_local
import document_generation as documents
import environment_manager
import file_import
import local_bridge
import media_generation as media
import scheduled_messages
import tool_gateway
import update_manager
import worktree_manager


class ImportTests(unittest.TestCase):
    def test_same_bytes_with_another_name_reuses_original_and_extraction(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(file_import, 'BASE', Path(tmp)):
            encoded = base64.b64encode('bonjour été'.encode('utf-16')).decode()
            first = file_import.ingest({'name': 'notes.txt', 'data': encoded})
            with patch.object(file_import, 'extract', side_effect=AssertionError('Repeated extraction')):
                second = file_import.ingest({'name': 'renamed.md', 'data': encoded})
            self.assertEqual(first['preview'], 'bonjour été')
            self.assertEqual(first['path'], second['path'])
            self.assertEqual(len(list(Path(tmp).glob('*/original.*'))), 1)

    def test_rejected_file_leaves_no_original_or_partial_directory(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(file_import, 'BASE', Path(tmp)):
            with self.assertRaises(ValueError):
                file_import.ingest({'name': 'unknown.bin', 'data': base64.b64encode(b'\0binary').decode()})
            self.assertEqual(list(Path(tmp).iterdir()), [])

    def test_bad_request_is_reported_without_traceback(self):
        for body in (b'[]', b'null', b'{"name": 3}', b'{"data":"not-base64"}'):
            self.assertIn(b'400 Bad Request', file_import.response('POST', body))


class StateTests(unittest.TestCase):
    def test_permanent_worktree_is_registered_as_named_project(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'root';root.mkdir();base=root/'.dev-local/corpus-local';settings=root/'config'
            created=[]
            def git(*args,**kwargs):
                if args[:2]==('worktree','add'):
                    path=Path(args[-2]);path.mkdir();created.append(path);return ''
                if args[:2]==('worktree','list'):
                    return '\n\n'.join('worktree '+str(path)+'\nHEAD example\nbranch refs/heads/main' for path in [root,*created])+'\n'
                raise AssertionError(args)
            with patch.object(worktree_manager,'ROOT',root), patch.object(worktree_manager,'BASE',base), patch.object(worktree_manager,'SETTINGS',settings/'worktrees.json'), patch.object(environment_manager,'ROOT',root), patch.object(environment_manager,'BASE',base), patch.object(environment_manager,'SETTINGS',settings/'environments.json'), patch.object(worktree_manager,'git',side_effect=git), patch('hooks_manager.created'), patch('git_settings.settings',return_value={'prefix':'test/'}):
                result=worktree_manager.operate({'action':'create','permanent':True,'name':' Copie permanente '})
                state=environment_manager.read();path=result['created']
                self.assertIn(path,state['projects'])
                self.assertEqual(state['names'][path],'Copie permanente')
                self.assertIn(path,result['settings']['permanent'])
                self.assertEqual(result['warnings'],[])
                private=base/'not-a-worktree';private.mkdir()
                with self.assertRaises(ValueError):environment_manager.project_path(str(private))

    def test_invalid_permanent_name_does_not_create_a_worktree(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(worktree_manager,'BASE',Path(tmp)), patch.object(worktree_manager,'SETTINGS',Path(tmp)/'settings.json'), patch.object(worktree_manager,'git') as git:
            for name in ('',None,'x'*81):
                with self.assertRaises(ValueError):worktree_manager.operate({'action':'create','permanent':True,'name':name})
            git.assert_not_called()

    def test_document_corruption_does_not_block_recovery_or_listing(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(documents, 'BASE', Path(tmp)):
            for key, raw in [('a', '{'), ('b', 'null'), ('c', '{"state":"running"}')]:
                directory = Path(tmp)/(key*32); directory.mkdir(); (directory/'job.json').write_text(raw)
            documents.save({'id':'d'*32,'state':'running','created':1})
            documents.recover()
            jobs = documents.operate({'action':'list'})['jobs']
            self.assertEqual([job['id'] for job in jobs], ['d'*32])
            self.assertEqual(jobs[0]['state'], 'failed')

    def test_concurrent_document_submissions_keep_eight_job_limit(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(documents, 'BASE', Path(tmp)), patch.object(documents, 'execute'):
            def create(_):
                try: return documents.operate({'action':'create','format':'txt','content':'example'})
                except ValueError: return None
            with ThreadPoolExecutor(max_workers=16) as pool:
                accepted = [job for job in pool.map(create, range(16)) if job]
            self.assertEqual(len(accepted), 8)
            self.assertEqual(len(documents.jobs()), 8)

    def test_media_corruption_is_isolated(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(media, 'BASE', Path(tmp)):
            for key, raw in [('a','null'), ('b','{}'), ('c','{')]:
                directory=Path(tmp)/'jobs'/(key*32); directory.mkdir(parents=True); (directory/'job.json').write_text(raw)
            self.assertEqual(media.jobs(), [])

    def test_idle_status_entries_do_not_block_media_queue(self):
        with patch.object(media.http.client, 'HTTPConnection') as connect:
            response=connect.return_value.getresponse.return_value; response.status=200
            for states, busy in [({},False), ({'ses_one':{'type':'idle'}},False), ({'ses_one':{'type':'busy'}},True), ([],True)]:
                response.read.return_value=json.dumps(states).encode()
                self.assertEqual(media.conversation_busy(), busy)

    def test_read_only_project_rejects_all_git_mutations(self):
        with patch.object(chat_actions, 'project', return_value='/tmp/example'), patch.object(environment_manager, 'read', return_value={'readonly':{'/tmp/example':True}}), patch.object(chat_actions.subprocess, 'run') as run:
            for action in ('stage','commit','push','switch','create-branch'):
                with self.assertRaisesRegex(ValueError, 'lecture seule'):
                    chat_actions.operate({'action':action,'confirmed':True})
            run.assert_not_called()

    def test_new_external_projects_and_readonly_roots_are_mounted(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'root'; root.mkdir(); external=Path(tmp)/'external'; external.mkdir(); readonly=root/'readonly'; readonly.mkdir()
            state={'projects':[str(root),str(external),str(readonly)],'readonly':{str(readonly):True}}
            with patch.object(corpus_local, 'ROOT', root), patch.object(environment_manager, 'read', return_value=state), patch.object(worktree_manager, 'operate', return_value={'entries':[]}):
                mounts=corpus_local.project_mounts()
            groups=[mounts[i:i+3] for i in range(0,len(mounts),3)]
            self.assertIn(['--bind',str(external),str(external)],groups)
            self.assertIn(['--ro-bind',str(readonly),str(readonly)],groups)


class ModelPathReceiptTests(unittest.TestCase):
    def test_receipt_path_accepts_canonical_models_outside_runtime(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            runtime = root / 'runtime/corpus-local'
            models = root / 'models/hot'
            runtime.mkdir(parents=True)
            (models / 'llm/qwen3.6').mkdir(parents=True)
            model = models / 'llm/qwen3.6/model.gguf'
            executable = runtime / 'versions/llama/llama-server'
            executable.parent.mkdir(parents=True)
            model.touch(); executable.touch()
            with patch.object(corpus_local, 'BASE', runtime), patch.object(corpus_local, 'MODELS_ROOT', models):
                self.assertEqual(corpus_local.receipt_path(model), 'llm/qwen3.6/model.gguf')
                self.assertEqual(corpus_local.receipt_path(executable), 'versions/llama/llama-server')


class TransportTests(unittest.TestCase):
    def test_portal_available_while_backend_starts_with_retryable_session_error(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(local_bridge,'PORT',0):
            path=Path(tmp)/'starting.sock'
            server=local_bridge.create_server(path,inside=False)
            threading.Thread(target=server.serve_forever,daemon=True).start()
            def get(target,host=b'127.0.0.1:0'):
                with socket.create_connection(server.server_address,timeout=3) as connection:
                    connection.sendall(b'GET '+target+b' HTTP/1.1\r\nHost: '+host+b'\r\n\r\n')
                    chunks=[]
                    while chunk:=connection.recv(65536):chunks.append(chunk)
                    return b''.join(chunks)
            try:
                self.assertIn(b'200 OK',get(b'/corpus/'))
                response=get(b'/session')
                self.assertIn(b'503 Service Unavailable',response)
                self.assertIn(b'Retry-After: 2',response)
                self.assertIn('démarre',json.loads(response.split(b'\r\n\r\n',1)[1])['error'])
                response=get(b'/corpus/api/health')
                self.assertIn(b'503 Service Unavailable',response)
                self.assertEqual(json.loads(response.split(b'\r\n\r\n',1)[1]),{'ready':False,'state':'starting_or_unavailable'})
                self.assertIn(b'403 Forbidden',get(b'/corpus/api/health',b'evil.example'))
                with socket.socket(socket.AF_UNIX) as backend:
                    backend.bind(str(path));backend.listen(2)
                    response=get(b'/corpus/api/health')
                    # A listening transport is not a usable conversation backend.
                    self.assertIn(b'503 Service Unavailable',response)
                ready=threading.Event()
                inside=local_bridge.create_server(path,inside=True,readiness=ready.is_set)
                threading.Thread(target=inside.serve_forever,daemon=True).start()
                try:
                    self.assertIn(b'503 Service Unavailable',get(b'/corpus/api/health'))
                    ready.set()
                    response=get(b'/corpus/api/health')
                    self.assertIn(b'200 OK',response)
                    self.assertEqual(json.loads(response.split(b'\r\n\r\n',1)[1]),{'ready':True,'state':'ready'})
                finally:
                    inside.shutdown();inside.server_close()
            finally:
                server.shutdown();server.server_close()

    def test_object_validation_and_methods(self):
        with patch.object(update_manager,'start'):
            for module in (tool_gateway,update_manager,scheduled_messages,documents):
                for body in (b'[]', b'null'):
                    self.assertIn(b'400 Bad Request',module.response('POST',body),module.__name__)
            for module in (documents,scheduled_messages):
                self.assertIn(b'400 Bad Request',module.response('DELETE',b'{}'))

    def test_mcp_long_document_reaches_handler(self):
        data={'operation':'document','arguments':{'action':'create','format':'txt','content':'été '*3500}}
        handler=tool_gateway.Handler.__new__(tool_gateway.Handler)
        handler.rfile=io.BytesIO(json.dumps(data).encode()+b'\n');handler.wfile=io.BytesIO()
        with patch.object(documents,'operate',return_value={'id':'example'}) as run:
            handler.handle()
            run.assert_called_once_with(data['arguments'])
        self.assertEqual(json.loads(handler.wfile.getvalue()),{'id':'example'})

    def test_mcp_schema_exposes_current_video_options(self):
        request=json.dumps({'jsonrpc':'2.0','id':1,'method':'tools/list'})+'\n'
        result=subprocess.run([sys.executable,str(Path(__file__).with_name('local_tools_mcp.py'))],input=request,capture_output=True,text=True,check=True,timeout=10)
        tools=json.loads(result.stdout)['result']['tools']
        schema=next(tool for tool in tools if tool['name']=='media_generate')['inputSchema']['properties']
        self.assertEqual(schema['frames']['enum'],[17,33,49,65,81,97,121])
        self.assertEqual(schema['soundtrack']['maxLength'],1500)

    def test_http_long_document_and_explicit_oversize_error(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(local_bridge,'PORT',0):
            server=local_bridge.create_server(Path(tmp)/'unused.sock',inside=False)
            threading.Thread(target=server.serve_forever,daemon=True).start()
            def request(length,body=b''):
                with socket.create_connection(server.server_address,timeout=3) as connection:
                    connection.sendall(b'POST /corpus/api/documents HTTP/1.1\r\nHost: 127.0.0.1:0\r\nOrigin: http://127.0.0.1:0\r\nContent-Type: application/json\r\nContent-Length: '+str(length).encode()+b'\r\n\r\n'+body)
                    return connection.recv(8192)
            try:
                body=json.dumps({'action':'create','format':'txt','content':'é'*14000}).encode()
                self.assertGreater(len(body),32000)
                with patch.object(documents,'response',return_value=b'HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\n{}') as response:
                    self.assertIn(b'200 OK',request(len(body),body))
                    response.assert_called_once_with('POST',body)
                    self.assertIn(b'413 Content Too Large',request(200001))
            finally:
                server.shutdown();server.server_close()

if __name__=='__main__': unittest.main()
