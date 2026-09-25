"""Bounded security/recovery fixtures; no user data or external requests."""
import base64
import io
import json
from pathlib import Path
import socket
import tempfile
import threading
import unittest
from unittest.mock import patch
import zipfile

import browser_worker
import chat_actions
import environment_manager
import file_import
import local_bridge
import local_resources
import local_statistics
import worktree_manager


class FileBoundaries(unittest.TestCase):
    def test_preview_rejects_traversal_and_symlinks_outside_or_into_private_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            project=Path(tmp)/'project';project.mkdir()
            outside=Path(tmp)/'secret.txt';outside.write_text('private')
            private=project/'.dev-local';private.mkdir();(private/'secret').write_text('private')
            (project/'outside.txt').symlink_to(outside)
            (project/'inside-private.txt').symlink_to(private/'secret')
            (project/'public.txt').write_text('public')
            with patch.object(chat_actions,'project',return_value=str(project)):
                for name in ('../secret.txt',str(outside),'outside.txt','inside-private.txt','.dev-local/secret'):
                    with self.assertRaises(ValueError):chat_actions.operate({'action':'file','path':name})
                result=chat_actions.operate({'action':'file','path':'public.txt'})
                self.assertEqual(base64.b64decode(result['url'].split(',')[1]),b'public')

    def test_compression_bomb_is_rejected_without_publishing(self):
        archive=io.BytesIO()
        with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as z:z.writestr('large.txt',b'A'*200000)
        with tempfile.TemporaryDirectory() as tmp,patch.object(file_import,'BASE',Path(tmp)):
            with self.assertRaisesRegex(ValueError,'compressée'):
                file_import.ingest({'name':'bomb.zip','data':base64.b64encode(archive.getvalue()).decode()})
            self.assertEqual(list(Path(tmp).iterdir()),[])

    def test_archive_traversal_members_are_only_listed_never_extracted(self):
        archive=io.BytesIO()
        with zipfile.ZipFile(archive,'w') as z:
            z.writestr('../../outside.txt','never extracted')
            info=zipfile.ZipInfo('link');info.create_system=3;info.external_attr=0o120777<<16;z.writestr(info,'/etc/passwd')
        with tempfile.TemporaryDirectory() as tmp,patch.object(file_import,'BASE',Path(tmp)/'imports'):
            result=file_import.ingest({'name':'archive.zip','data':base64.b64encode(archive.getvalue()).decode()})
            self.assertIn('../../outside.txt',result['preview'])
            self.assertFalse((Path(tmp)/'outside.txt').exists())
            self.assertFalse(list(Path(tmp).rglob('link')))


class ActionBoundaries(unittest.TestCase):
    def test_readonly_project_cannot_create_worktree_without_profile(self):
        with tempfile.TemporaryDirectory() as tmp,patch.object(worktree_manager,'BASE',Path(tmp)),patch.object(worktree_manager,'SETTINGS',Path(tmp)/'settings.json'),patch.object(environment_manager,'read',return_value={'readonly':{str(worktree_manager.ROOT):True}}),patch.object(worktree_manager,'git') as git:
            with self.assertRaisesRegex(ValueError,'lecture seule'):
                worktree_manager.operate({'action':'create','permanent':True,'name':'Copy'})
            git.assert_not_called()
            self.assertEqual(list(Path(tmp).iterdir()),[])

    def test_git_stage_treats_pathspec_like_names_literally_without_shell(self):
        with tempfile.TemporaryDirectory() as tmp,patch.object(chat_actions,'project',return_value=tmp),patch.object(environment_manager,'read',return_value={'readonly':{}}),patch.object(chat_actions.subprocess,'run') as run:
            run.return_value.returncode=0;run.return_value.stdout=''
            name=':(glob)*;echo unsafe'
            chat_actions.operate({'action':'stage','confirmed':True,'files':[name]})
            args,kwargs=run.call_args
            self.assertEqual(args[0],['git','-C',tmp,'--literal-pathspecs','add','--',name])
            self.assertFalse(kwargs.get('shell',False))

    def test_browser_rejects_local_control_credentials_and_non_http_schemes(self):
        for url in ['file:///etc/passwd','javascript:alert(1)','http://user:password@example.invalid/','http://127.0.0.1:18743/','http://[::1]:18743/']:
            with self.assertRaises(ValueError):browser_worker.origin(url)
        self.assertEqual(browser_worker.origin('https://example.invalid/path?x=1'),'https://example.invalid:443')


class RecoveryBoundaries(unittest.TestCase):
    def test_malformed_statistics_request_is_json_error(self):
        for body in (b'null',b'[]'):
            response=local_statistics.response('POST',body)
            self.assertIn(b'503 Service Unavailable',response)
            self.assertIn('error',json.loads(response.split(b'\r\n\r\n',1)[1]))

    def test_incoherent_activity_does_not_hide_memory_or_disk(self):
        with tempfile.TemporaryDirectory() as tmp:
            meminfo=Path(tmp)/'memory';meminfo.write_text('MemTotal: 1000 kB\nMemAvailable: 500 kB\n')
            result=local_resources.snapshot(base=tmp,meminfo=meminfo,aggregate=lambda _: {'metrics':None})
            self.assertEqual(result['memory'],{'total':1024000,'available':512000})
            self.assertIsNotNone(result['disk'])
            self.assertIsNone(result['activity'])
            self.assertIn('activity',result['errors'])
        with patch.object(local_statistics,'aggregate',side_effect=AttributeError('sensitive detail')):
            response=local_statistics.response('GET',b'')
            self.assertIn(b'503 Service Unavailable',response)
            self.assertNotIn(b'sensitive detail',response)

    def test_http_origin_guards_block_untrusted_and_absent_origin_before_handler(self):
        with tempfile.TemporaryDirectory() as tmp,patch.object(local_bridge,'PORT',0):
            server=local_bridge.create_server(Path(tmp)/'not-started.sock',inside=False)
            threading.Thread(target=server.serve_forever,daemon=True).start()
            def request(origin,host='127.0.0.1:0'):
                body=b'{}';headers=['POST /corpus/api/file-import HTTP/1.1','Host: '+host,'Content-Type: application/json','Content-Length: 2']
                if origin is not None:headers.append('Origin: '+origin)
                with socket.create_connection(server.server_address,timeout=3) as peer:
                    peer.sendall(('\r\n'.join(headers)+'\r\n\r\n').encode()+body)
                    return peer.recv(8192)
            try:
                with patch.object(file_import,'response') as response:
                    for origin in (None,'null','https://example.invalid','http://127.0.0.1:0.example.invalid'):
                        self.assertIn(b'403 Forbidden',request(origin))
                    self.assertIn(b'403 Forbidden',request('http://127.0.0.1:0',host='example.invalid'))
                    response.assert_not_called()
            finally:server.shutdown();server.server_close()

if __name__=='__main__':unittest.main()
