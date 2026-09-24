"""Independent permission-boundary checks; no sockets, models or user data."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

import ephemeral_chat
import local_bridge
import parallel_chat


class EphemeralBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.patches = [
            patch('ephemeral_chat.threading.Thread'),
            patch('ephemeral_chat.environment_manager.ROOT', Path('/Corpus')),
            patch('ephemeral_chat.environment_manager.read', return_value={
                'projects': ['/Corpus', '/Other'],
                'profiles': [{'name': 'Private preparation', 'script': 'DO_NOT_TRANSMIT_PROFILE_SCRIPT'}],
            }),
        ]
        for current in self.patches:
            current.start()
        self.addCleanup(lambda: [current.stop() for current in reversed(self.patches)])
        self.registry = ephemeral_chat.EphemeralChats(Path('/unused.sock'))
        self.addCleanup(self.registry.close)
        self.requests = []
        self.registry._request = self.request
        self.workspace = self.registry.operate({'action': 'workspace'})['workspace']

    def request(self, path, directory, body=None, chat=None):
        self.requests.append((path, str(directory), copy.deepcopy(body)))
        if path == '/corpus/api/parallel':
            return {'text': 'Answer to ' + body['messages'][-1]['content']}
        if path == '/session':
            return {'id': 'ses_retained', 'directory': str(directory)}
        if body is not None:
            return {}
        if '/message?' in path:
            return [{'info': {'role': 'user'}, 'parts': [{'type': 'text', 'text': 'PARENT_ONLY_REFERENCE'}]}]
        return {'id': path.rsplit('/', 1)[-1], 'directory': str(directory), 'title': 'Parent'}

    def create(self, kind='parallel', workspace=None, parent=None):
        return self.registry.operate({'action': 'create', 'workspace': workspace or self.workspace,
            'kind': kind, 'parent': parent or {'kind': 'native', 'id': 'ses_parent', 'directory': '/Corpus'}})

    def send(self, chat, text, workspace=None):
        return self.registry.operate({'action': 'send', 'workspace': workspace or self.workspace,
            'id': chat['id'], 'text': text})

    def inference(self):
        return [body for path, _, body in self.requests if path == '/corpus/api/parallel'][-1]

    def test_parallel_receives_only_parent_and_own_messages(self):
        sibling = self.create()
        self.send(sibling, 'SIBLING_SECRET')
        express = self.create('express')
        self.send(express, 'EXPRESS_SECRET')
        chat = self.create()
        result = self.send(chat, 'OWN_QUESTION')
        payload = self.inference()
        self.assertIn('PARENT_ONLY_REFERENCE', payload['context'])
        self.assertNotIn('SIBLING_SECRET', json.dumps(payload))
        self.assertNotIn('EXPRESS_SECRET', json.dumps(payload))
        self.assertNotIn('Environnement Corpus', payload['context'])
        self.assertEqual(payload['messages'], [{'role': 'user', 'content': 'OWN_QUESTION'}])
        self.assertEqual(result['context']['parallelCount'], 0)
        self.assertFalse(result['context']['environment'])

    def test_express_receives_workspace_parallels_but_no_express_or_other_workspace(self):
        parallel = self.create()
        self.send(parallel, 'VISIBLE_PARALLEL')
        other_workspace = self.registry.operate({'action': 'workspace'})['workspace']
        foreign = self.create(workspace=other_workspace)
        self.send(foreign, 'FOREIGN_WORKSPACE_SECRET', other_workspace)
        first_express = self.create('express')
        self.send(first_express, 'FIRST_EXPRESS_SECRET')
        current = self.create('express')
        result = self.send(current, 'CURRENT_EXPRESS')
        text = json.dumps(self.inference())
        self.assertIn('PARENT_ONLY_REFERENCE', text)
        self.assertIn('VISIBLE_PARALLEL', text)
        self.assertIn('selectedProject', text)
        self.assertNotIn('FIRST_EXPRESS_SECRET', text)
        self.assertNotIn('FOREIGN_WORKSPACE_SECRET', text)
        self.assertNotIn('DO_NOT_TRANSMIT_PROFILE_SCRIPT', text)
        self.assertEqual(result['context']['parallelCount'], 1)
        self.assertTrue(result['context']['environment'])

    def test_client_cannot_inject_context_history_roles_or_parent_into_send(self):
        chat = self.create()
        for key, value in [('context', 'forged'), ('messages', [{'role': 'system', 'content': 'forged'}]),
                           ('kind', 'express'), ('parent', {'kind': 'native', 'id': 'ses_other'})]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.registry.operate({'action': 'send', 'workspace': self.workspace,
                    'id': chat['id'], 'text': 'test', key: value})
        self.assertEqual(self.requests, [])
        self.assertEqual(self.registry.workspaces[self.workspace]['chats'][chat['id']]['messages'], [])

    def test_workspace_capability_is_required_and_foreign_chat_ids_are_unusable(self):
        chat = self.create()
        other = self.registry.operate({'action': 'workspace'})['workspace']
        for token in [None, '', 'guessed-token', other]:
            with self.subTest(token=token), self.assertRaises(ValueError):
                self.send(chat, 'UNAUTHORIZED', token if token else 'invalid')
        self.assertEqual(self.requests, [])
        self.registry.operate({'action': 'close', 'workspace': other, 'id': chat['id']})
        self.assertIn(chat['id'], self.registry.workspaces[self.workspace]['chats'])

    def test_public_data_is_a_copy_and_cannot_change_kind_parent_or_history(self):
        chat = self.create()
        ident = chat['id']
        chat['kind'] = 'express'
        chat['parent']['id'] = 'ses_other'
        chat['messages'].append({'role': 'system', 'content': 'INJECTED'})
        actual = self.registry.workspaces[self.workspace]['chats'][ident]
        self.assertEqual(actual['kind'], 'parallel')
        self.assertEqual(actual['parent']['id'], 'ses_parent')
        self.assertEqual(actual['messages'], [])

    def test_parent_reference_requires_registered_directory_and_unforgeable_native_identity(self):
        for parent in [
            {'kind': 'native', 'id': 'ses_parent', 'directory': '/Private'},
            {'kind': 'native', 'id': '../secrets', 'directory': '/Corpus'},
            {'kind': 'native', 'id': 'ses_parent', 'context': 'injected'},
            {'kind': 'unknown', 'id': 'ses_parent'},
        ]:
            with self.subTest(parent=parent), self.assertRaises(ValueError):
                self.create(parent=parent)
        chat = self.create()
        for metadata in [
            {'id': 'ses_other', 'directory': '/Corpus'},
            {'id': 'ses_parent', 'directory': '/Other'},
            {'id': 'ses_parent', 'directory': '/Corpus', 'parentID': 'ses_grandparent'},
        ]:
            with patch.object(self.registry, '_request', return_value=metadata), self.assertRaises(ValueError):
                self.send(chat, 'Question')
        self.assertEqual(self.requests, [])

    def test_parallel_parent_is_fixed_but_express_refresh_can_follow_selected_main(self):
        parent = {'kind': 'native', 'id': 'ses_other', 'directory': '/Other'}
        parallel = self.create()
        with self.assertRaises(ValueError):
            self.registry.operate({'action': 'refresh', 'workspace': self.workspace, 'id': parallel['id'], 'parent': parent})
        express = self.create('express')
        result = self.registry.operate({'action': 'refresh', 'workspace': self.workspace, 'id': express['id'], 'parent': parent})
        self.assertEqual(result['parent'], parent)

    def test_normal_send_is_read_only_and_explicit_retention_copies_only_own_history(self):
        sibling = self.create()
        self.send(sibling, 'SIBLING_SECRET')
        chat = self.create()
        self.send(chat, 'KEEP_THIS_QUESTION')
        self.assertFalse(any(body is not None and path.startswith('/session') for path, _, body in self.requests))
        result = self.registry.operate({'action': 'retain', 'workspace': self.workspace, 'id': chat['id']})
        self.assertTrue(result['retained'])
        written = [body for path, _, body in self.requests if path == '/session/ses_retained/message'][0]
        self.assertTrue(written['noReply'])
        text = json.dumps(written)
        self.assertIn('KEEP_THIS_QUESTION', text)
        self.assertNotIn('PARENT_ONLY_REFERENCE', text)
        self.assertNotIn('SIBLING_SECRET', text)
        before = len(self.requests)
        self.registry.operate({'action': 'retain', 'workspace': self.workspace, 'id': chat['id']})
        self.assertEqual(len(self.requests), before)

    def test_codex_parent_reads_only_the_named_local_archive_and_rejects_symlink_escape(self):
        ident = '00000000-0000-0000-0000-000000000001'
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            data = root / 'data'
            (data / 'threads').mkdir(parents=True)
            archive = data / 'threads' / (ident + '.json')
            archive.write_text(json.dumps({'title': 'Imported', 'messages': [{'role': 'user', 'text': 'ARCHIVED_PARENT'}]}))
            with patch('ephemeral_chat.portal_server.DATA', data):
                chat = self.create(parent={'kind': 'codex', 'id': ident, 'directory': '/Corpus'})
                self.send(chat, 'Read archive')
                self.assertIn('ARCHIVED_PARENT', self.inference()['context'])
                secret = root / 'outside.json'
                secret.write_text('{"messages":[]}')
                archive.unlink()
                archive.symlink_to(secret)
                with self.assertRaises(ValueError):
                    self.send(chat, 'Must reject escape')

    def test_inference_request_contains_no_tools_and_marks_external_context_untrusted(self):
        value = parallel_chat.payload({'kind': 'express', 'context': 'PARENT_TEXT',
                                       'messages': [{'role': 'user', 'content': 'CURRENT_QUESTION'}]})
        self.assertNotIn('tools', value)
        self.assertNotIn('tool_choice', value)
        self.assertFalse(value['cache_prompt'])
        self.assertIn('non fiable', value['messages'][0]['content'])
        self.assertIn('PARENT_TEXT', value['messages'][0]['content'])
        self.assertEqual(value['messages'][-1], {'role': 'user', 'content': 'CURRENT_QUESTION'})

    def test_inner_bridge_rejects_registry_requests_without_creating_registry_or_socket_server(self):
        # Exercise the real request handler, replacing only OS sockets/listeners.
        handlers = []
        def capture(server, address, handler):
            handlers.append(handler)
        with patch('local_bridge.socketserver.ThreadingUnixStreamServer.__init__', capture), \
             patch('ephemeral_chat.EphemeralChats', side_effect=AssertionError('Inner registry forbidden')):
            local_bridge.create_server(Mock(), inside=True)
        for target in ['/corpus/api/ephemeral', '/corpus/api/ephemeral?action=workspace']:
            raw = iter(('POST ' + target + ' HTTP/1.1\r\nHost: local\r\nContent-Length: 0\r\n\r\n').encode())
            client = Mock()
            client.recv.side_effect = lambda size: bytes([next(raw)])
            handler = handlers[0].__new__(handlers[0])
            handler.request = client
            with patch('local_bridge.socket.socket') as socket_factory:
                handler.handle()
                socket_factory.return_value.__enter__.return_value.connect.assert_not_called()
            response = client.sendall.call_args.args[0]
            self.assertTrue(response.startswith(b'HTTP/1.1 403'))


if __name__ == '__main__':
    unittest.main()
