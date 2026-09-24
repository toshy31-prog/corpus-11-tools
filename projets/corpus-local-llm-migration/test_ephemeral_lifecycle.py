import base64
from concurrent.futures import ThreadPoolExecutor
import copy
import http.client
import io
import json
from pathlib import Path
import socket
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch
import zipfile

from PIL import Image
import ephemeral_attachments
import ephemeral_chat
import parallel_chat


class EphemeralLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.env = patch('ephemeral_chat.environment_manager.read', return_value={'projects': ['/Corpus'], 'profiles': []})
        self.env.start(); self.addCleanup(self.env.stop)
        self.registry = ephemeral_chat.EphemeralChats(Path('/unused.sock'), clock=lambda: self.now)
        self.addCleanup(self.registry.close)
        self.now = 0
        self.workspace = self.registry.operate({'action': 'workspace'})['workspace']
        self.parent = {'kind': 'native', 'id': 'ses_parent', 'directory': '/Corpus'}
        self.registry._parent_text = Mock(return_value=('PARENT_REFERENCE', 'Parent'))
        self.requests = []
        def request(path, directory, body=None, chat=None):
            self.requests.append((path, copy.deepcopy(body)))
            return {'text': 'Answer'} if path == '/corpus/api/parallel' else {'id': 'ses_saved', 'directory': '/Corpus'}
        self.registry._request = request

    def action(self, action, chat=None, **kwargs):
        return self.registry.operate({'action': action, 'workspace': self.workspace,
                                     **({'id': chat['id']} if chat else {}), **kwargs})

    def create(self, kind='parallel'):
        return self.action('create', kind=kind, parent=self.parent)

    def upload(self, chat, name, raw):
        return self.action('upload', chat, name=name, data=base64.b64encode(raw).decode())

    def test_close_and_lease_expiry_erase_logs_attachments_and_cancel_connection(self):
        chat = self.create()
        self.upload(chat, 'private.txt', b'PRIVATE')
        record = self.registry.workspaces[self.workspace]['chats'][chat['id']]
        connection = Mock(); record['connection'] = connection
        self.now = 599
        self.registry.expire()
        self.assertIn(self.workspace, self.registry.workspaces)
        self.now = 600
        self.registry.expire()
        self.assertNotIn(self.workspace, self.registry.workspaces)
        self.assertTrue(record['cancelled'].is_set())
        self.assertEqual(record['messages'], [])
        self.assertEqual(record['attachments'], {})
        connection.sock.shutdown.assert_called_once_with(socket.SHUT_RDWR)
        connection.close.assert_called_once()

    def test_touch_extends_lease_and_close_is_idempotent(self):
        chat = self.create(); self.now = 590
        self.action('touch'); self.now = 601; self.registry.expire()
        self.assertIn(self.workspace, self.registry.workspaces)
        self.assertTrue(self.action('close', chat)['closed'])
        self.assertTrue(self.action('close', chat)['closed'])
        self.action('close-workspace')
        self.assertEqual(self.registry.workspaces, {})

    def test_close_during_parent_read_never_starts_inference(self):
        chat = self.create(); entered, release = threading.Event(), threading.Event()
        def parent(_): entered.set(); release.wait(2); return ('parent', 'title')
        self.registry._parent_text = parent
        with ThreadPoolExecutor(max_workers=1) as pool:
            pending = pool.submit(self.action, 'send', chat, text='question')
            self.assertTrue(entered.wait(1))
            self.action('close', chat); release.set()
            with self.assertRaises(ValueError): pending.result(2)
        self.assertEqual(self.requests, [])

    def test_close_during_response_cuts_connection_and_rejects_late_answer(self):
        chat = self.create(); entered, cancelled = threading.Event(), threading.Event()
        def request(path, directory, body=None, chat=None):
            connection = Mock(); connection.sock.shutdown.side_effect = lambda *_: cancelled.set()
            chat['connection'] = connection; entered.set(); cancelled.wait(2)
            return {'text': 'TOO_LATE'}
        self.registry._request = request
        with ThreadPoolExecutor(max_workers=1) as pool:
            pending = pool.submit(self.action, 'send', chat, text='question')
            self.assertTrue(entered.wait(1)); self.action('close', chat)
            with self.assertRaises(ValueError): pending.result(2)
        self.assertTrue(cancelled.is_set())
        self.assertNotIn(chat['id'], self.registry.workspaces[self.workspace]['chats'])

    def test_concurrent_send_is_refused_without_appending_duplicate_user_message(self):
        chat = self.create(); entered, release = threading.Event(), threading.Event()
        def request(*_, **__): entered.set(); release.wait(2); return {'text': 'done'}
        self.registry._request = request
        with ThreadPoolExecutor(max_workers=1) as pool:
            pending = pool.submit(self.action, 'send', chat, text='first')
            self.assertTrue(entered.wait(1))
            with self.assertRaises(ValueError): self.action('send', chat, text='second')
            release.set(); pending.result(2)
        self.assertEqual([m['content'] for m in self.action('refresh', chat)['messages']], ['first', 'done'])

    def test_explicit_retention_freezes_own_copy_before_later_close(self):
        chat = self.create(); self.action('send', chat, text='OWN_KEEP')
        entered, release = threading.Event(), threading.Event(); writes = []
        def request(path, directory, body=None, chat=None):
            if path == '/session': entered.set(); release.wait(2); return {'id': 'ses_saved'}
            writes.append(copy.deepcopy(body)); return {}
        self.registry._request = request
        with ThreadPoolExecutor(max_workers=1) as pool:
            pending = pool.submit(self.action, 'retain', chat)
            self.assertTrue(entered.wait(1))
            self.assertTrue(self.action('close', chat)['preservationPending'])
            release.set(); self.assertTrue(pending.result(2)['retained'])
        self.assertTrue(writes[0]['noReply'])
        self.assertIn('OWN_KEEP', json.dumps(writes))
        self.assertNotIn('PARENT_REFERENCE', json.dumps(writes))

    def test_documents_remain_private_until_explicit_conservation(self):
        chat = self.create()
        with patch('file_import.ingest') as persist:
            attachment = self.upload(chat, 'secret.txt', b'PRIVATE_DOCUMENT')
            self.assertEqual(attachment['preview'], 'PRIVATE_DOCUMENT')
            self.assertFalse(set(attachment) & {'path', 'textPath', 'data', 'url'})
            self.action('send', chat, text='', attachments=[attachment['id']])
            self.assertIn('PRIVATE_DOCUMENT', json.dumps(self.requests[-1]))
            persist.assert_not_called()
            persist.return_value = {'name': 'secret.txt', 'path': '/saved/original.txt', 'textPath': '/saved/content.txt'}
            self.action('retain', chat)
            persist.assert_called_once_with({'name': 'secret.txt', 'data': base64.b64encode(b'PRIVATE_DOCUMENT').decode()})

    def test_attachment_ids_cannot_be_reused_by_a_sister_chat(self):
        first, second = self.create(), self.create()
        attachment = self.upload(first, 'secret.txt', b'SISTER_PRIVATE_FILE')
        with self.assertRaises(ValueError):
            self.action('send', second, text='read it', attachments=[attachment['id']])
        self.action('send', second, text='question')
        self.assertNotIn('SISTER_PRIVATE_FILE', json.dumps(self.requests[-1]))
        self.assertNotIn(attachment['id'], json.dumps(self.requests[-1]))

    def test_own_and_authorized_express_images_reach_only_vision_payload(self):
        raw = io.BytesIO(); Image.new('RGB', (2, 2), 'blue').save(raw, 'PNG')
        first, second, express = self.create(), self.create(), self.create('express')
        attachment = self.upload(first, 'capture.png', raw.getvalue())
        self.action('send', first, text='image', attachments=[attachment['id']])
        payload = self.requests[-1][1]
        self.assertEqual(payload['messages'][-1]['content'][1]['type'], 'image_url')
        validated = parallel_chat.payload(payload)
        self.assertNotIn('tools', validated)
        self.assertIn('data:image/png;base64,', json.dumps(validated))
        self.action('send', second, text='question')
        self.assertNotIn('data:image', json.dumps(self.requests[-1]))
        response = self.action('send', express, text='look at parallel')
        self.assertEqual(response['context']['sharedImages'], 1)
        self.assertIn('data:image/png;base64,', json.dumps(self.requests[-1]))

    def test_removal_before_send_and_unsupported_formats_are_explicit(self):
        chat = self.create(); attachment = self.upload(chat, 'note.txt', b'hello')
        self.action('remove-attachment', chat, attachment=attachment['id'])
        with self.assertRaises(ValueError): self.action('send', chat, text='x', attachments=[attachment['id']])
        for name in ['audio.mp3', 'video.mp4', 'unknown.exe']:
            with self.assertRaisesRegex(ValueError, 'non pris en charge'):
                self.upload(chat, name, b'not-supported')
        self.assertEqual(self.registry.workspaces[self.workspace]['chats'][chat['id']]['attachments'], {})

    def test_pdf_conversion_is_private_and_cleanup_runs_even_after_failure(self):
        observed = []
        def extract(raw, suffix, directory):
            observed.append(directory)
            self.assertTrue(str(directory).startswith('/tmp/corpus-ephemeral-'))
            self.assertEqual((directory / 'original.pdf').read_bytes(), raw)
            return 'extracted', 'PDF text only'
        with patch('file_import.extract', side_effect=extract):
            result = ephemeral_attachments.interpret('long.pdf', b'%PDF-private')
        self.assertEqual(result['preview'], 'extracted')
        self.assertFalse(observed[0].exists())
        def fail(raw, suffix, directory): observed.append(directory); raise ValueError('bad pdf')
        with patch('file_import.extract', side_effect=fail), self.assertRaises(ValueError):
            ephemeral_attachments.interpret('bad.pdf', b'%PDF-private')
        self.assertFalse(observed[-1].exists())

    def test_zip_members_are_listed_without_extracting_paths(self):
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, 'w') as file: file.writestr('../../escape.txt', 'zip member')
        result = ephemeral_attachments.interpret('archive.zip', archive.getvalue())
        self.assertIn('../../escape.txt', result['preview'])
        self.assertIn('Inventaire ZIP uniquement', result['notice'])


class ModelCancellationTests(unittest.TestCase):
    def test_dropped_client_disconnects_model_http_request(self):
        listener = socket.socket(); listener.bind(('127.0.0.1', 0)); listener.listen(1)
        self.addCleanup(listener.close)
        received, dropped = threading.Event(), threading.Event()
        def model():
            connection, _ = listener.accept()
            with connection:
                connection.settimeout(3)
                header = b''
                while b'\r\n\r\n' not in header: header += connection.recv(1)
                size = int(next(line.split(b':',1)[1] for line in header.split(b'\r\n') if line.lower().startswith(b'content-length:')))
                body = b''
                while len(body) < size: body += connection.recv(size-len(body))
                received.set()
                if connection.recv(1) == b'': dropped.set()
        model_thread = threading.Thread(target=model, daemon=True); model_thread.start()
        browser, bridge = socket.socketpair()
        original = http.client.HTTPConnection
        try:
            with patch('parallel_chat.http.client.HTTPConnection', side_effect=lambda *_a, **_k: original('127.0.0.1', listener.getsockname()[1], timeout=3)):
                worker = threading.Thread(target=parallel_chat.respond_to_client, args=(json.dumps({'messages':[{'role':'user','content':'q'}]}).encode(), bridge), daemon=True)
                worker.start(); self.assertTrue(received.wait(2)); browser.close()
                self.assertTrue(dropped.wait(2)); worker.join(2)
                self.assertFalse(worker.is_alive())
        finally:
            browser.close(); bridge.close()
        model_thread.join(2)


if __name__ == '__main__': unittest.main()
