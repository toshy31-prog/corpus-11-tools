"""Contrats utiles : import limité, routes fermées et archives non exécutées."""
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
import import_continuity as migration
import portal_server as portal


class ContinuityTests(unittest.TestCase):
    def test_workspace_boundary(self):
        self.assertTrue(migration.relevant(str(migration.ROOT)))
        self.assertFalse(migration.relevant(str(migration.ROOT) + '-unrelated'))
        self.assertTrue(migration.relevant('/home/olivier/.codex/worktrees/example/Corpus'))

    def test_import_excludes_internal_content(self):
        for role, channel in [('developer', None), ('system', None), ('assistant', 'analysis')]:
            self.assertIsNone(migration.message_text({'type': 'message', 'role': role,
                'channel': channel, 'content': [{'type': 'output_text', 'text': 'internal'}]}))
        self.assertIsNone(migration.message_text({'type': 'function_call_output', 'content': []}))

    def test_user_text_preserved_without_ambient_ui(self):
        payload = {'type': 'message', 'role': 'user', 'content': [{'type': 'input_text',
            'text': '<in-app-browser-context>UI</in-app-browser-context>\nGo <script>alert(1)</script>'}]}
        self.assertEqual(migration.message_text(payload), 'Go <script>alert(1)</script>')

    def test_routes_cannot_read_arbitrary_files(self):
        for path in ['/corpus/../state.json', '/corpus/data/threads/../../auth.json',
                     '/corpus/%2e%2e/%2e%2e/etc/passwd']:
            self.assertIn(b'404 Not Found', portal.response('GET', path))
        self.assertIsNone(portal.response('GET', '/session'))
        self.assertIn(b'405 Method Not Allowed', portal.response('POST', '/corpus/'))

    def test_icon_never_falls_back_to_application_html(self):
        self.assertIn(b'204 No Content', portal.response('GET', '/favicon.ico'))

    def test_home_returns_to_corpus(self):
        reply = portal.response('GET', '/')
        self.assertIn(b'302 Found', reply)
        self.assertIn(b'Location: /corpus/', reply)
        self.assertIsNone(portal.response('GET', '/session/session-id/message'))

    def test_session_html_has_local_navigation(self):
        with patch.object(portal, 'engine_page', return_value=b'<html>session</html>') as page:
            reply = portal.response('GET', '/server/local/session/example?corpus_embed=1', 'iframe')
            self.assertIn(b'200 OK', reply)
            self.assertIn(b'Cache-Control: no-store', reply)
            page.assert_called_once()

    def test_engine_entry_keeps_corpus_shell(self):
        for url in ['/new-session?draftId=test', '/server/local/session/ses_example']:
            with patch.object(portal, 'engine_page') as page:
                result = portal.response('GET', url, 'document')
                self.assertIn(b'id="list"', result)
                self.assertIn(b'id="chat"', result)
                page.assert_not_called()

    def test_explicit_corpus_entry(self):
        response = portal.response('GET', '/corpus/index.html?session=ses_example')
        self.assertIn(b'id="chat"', response)
        self.assertIn(b'id="list"', response)

    def test_csp_and_head(self):
        self.assertIn(b"script-src 'self'", portal.response('GET', '/corpus/'))
        self.assertTrue(portal.response('HEAD', '/corpus/').endswith(b'\r\n\r\n'))

    def test_local_attachment_previews_allowed_without_expanding_network_or_scripts(self):
        head=portal.response('GET','/corpus/').split(b'\r\n\r\n',1)[0].decode()
        policy=next(line.split(': ',1)[1] for line in head.split('\r\n') if line.startswith('Content-Security-Policy:'))
        rules=dict(part.strip().split(' ',1) for part in policy.split(';'))
        self.assertEqual(rules['img-src'],"'self' data: blob:")
        self.assertEqual(rules['media-src'],"'self' blob:")
        self.assertEqual(rules['frame-src'],"'self' blob:")
        self.assertEqual(rules['script-src'],"'self'")
        self.assertEqual(rules['connect-src'],"'self'")
        self.assertEqual(rules['object-src'],"'none'")
        self.assertEqual(rules['frame-ancestors'],"'none'")

    def test_search_is_literal_and_accent_insensitive(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(portal, 'DATA', Path(tmp)):
            with sqlite3.connect(Path(tmp) / 'search.sqlite') as db:
                db.execute('CREATE VIRTUAL TABLE texts USING fts5(id UNINDEXED, body)')
                db.execute('INSERT INTO texts VALUES (?,?)', ('test', 'corbeau créativité'))
            result = portal.response('GET', '/corpus/search?q=creativite')
            self.assertEqual(json.loads(result.split(b'\r\n\r\n')[1]), ['test'])
            self.assertIn(b'200 OK', portal.response('GET', '/corpus/search?q=%22%20OR%20%2A'))


if __name__ == '__main__':
    unittest.main()
