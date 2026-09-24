"""Startup probes use bounded, local, read-only requests, never inference."""
from concurrent.futures import ThreadPoolExecutor
import json
import threading
import unittest
from unittest.mock import Mock, patch

from backend_startup import BackendStartup


AGENTS = [{'name': 'corpus', 'mode': 'primary'}]


class BackendStartupTests(unittest.TestCase):
    def test_prepares_only_agents_and_statuses_without_prompt(self):
        startup = BackendStartup(18744, '/workspace')
        with patch.object(startup, '_read', side_effect=[AGENTS, {}]) as read:
            startup._warm()
        self.assertTrue(startup.is_ready())
        self.assertEqual([c.args[0] for c in read.call_args_list], ['/agent', '/session/status'])

    def test_invalid_or_unavailable_backend_never_reports_ready(self):
        for invalid in ([], {}, [{'name': 'other'}], [{'name': 'corpus', 'mode': 'subagent'}]):
            startup = BackendStartup(18744, '/workspace')
            with patch.object(startup, '_read', return_value=invalid) as read, patch.object(startup._stop, 'wait', return_value=False):
                startup._warm()
            self.assertFalse(startup.is_ready())
            self.assertEqual(read.call_count, 3)
        startup = BackendStartup(18744, '/workspace')
        with patch.object(startup, '_read', side_effect=[AGENTS, []] * 3), patch.object(startup._stop, 'wait', return_value=False):
            startup._warm()
        self.assertFalse(startup.is_ready())

    def test_failed_pass_is_bounded_and_health_can_retry_after_cooldown(self):
        startup = BackendStartup(18744, '/workspace')
        with patch.object(startup, '_read', side_effect=TimeoutError) as read, patch.object(startup._stop, 'wait', return_value=False), patch('backend_startup.time.monotonic', return_value=100):
            startup._warm()
        self.assertEqual(read.call_count, 3)
        with patch('backend_startup.threading.Thread') as thread, patch('backend_startup.time.monotonic', return_value=102):
            self.assertFalse(startup.is_ready())
            thread.assert_not_called()
        with patch('backend_startup.threading.Thread') as thread, patch('backend_startup.time.monotonic', return_value=106):
            self.assertFalse(startup.is_ready())
            thread.return_value.start.assert_called_once()

    def test_many_health_polls_share_one_background_warmup(self):
        startup = BackendStartup(18744, '/workspace')
        entered, release = threading.Event(), threading.Event()
        def read(path):
            entered.set()
            release.wait(2)
            return AGENTS if path == '/agent' else {}
        try:
            with patch.object(startup, '_read', side_effect=read) as read_mock:
                with ThreadPoolExecutor(max_workers=8) as pool:
                    results = list(pool.map(lambda _: startup.is_ready(), range(24)))
                self.assertTrue(entered.wait(1))
                self.assertEqual(results, [False] * 24)
                self.assertEqual(read_mock.call_count, 1)
                release.set()
                self.assertTrue(startup._ready.wait(2))
                self.assertEqual(read_mock.call_count, 2)
        finally:
            release.set()
            startup.close()

    def test_closing_during_probe_cannot_mark_backend_ready(self):
        startup = BackendStartup(18744, '/workspace')
        def read(path):
            if path == '/agent':
                startup.close()
                return AGENTS
            return {}
        with patch.object(startup, '_read', side_effect=read):
            startup._warm()
        with patch('backend_startup.threading.Thread') as thread:
            self.assertFalse(startup.is_ready())
            thread.assert_not_called()

    def test_read_is_local_bounded_and_connection_always_closed(self):
        connection = Mock()
        response = connection.getresponse.return_value
        response.status = 200
        response.getheader.return_value = 'application/json'
        response.read.return_value = json.dumps(AGENTS).encode()
        startup = BackendStartup(18744, '/workspace')
        with patch('backend_startup.http.client.HTTPConnection', return_value=connection) as factory:
            self.assertEqual(startup._read('/agent'), AGENTS)
        factory.assert_called_once_with('127.0.0.1', 18744, timeout=10)
        connection.request.assert_called_once_with('GET', '/agent', headers={'x-opencode-directory': '/workspace', 'Accept': 'application/json'})
        response.read.assert_called_once_with(2_000_001)
        connection.close.assert_called_once()
        for status, content_type, body in [(503, 'application/json', b'{}'), (200, 'text/html', b'{}'), (200, 'application/json', b'not JSON'), (200, 'application/json', b'x' * 2_000_001)]:
            response.status = status
            response.getheader.return_value = content_type
            response.read.return_value = body
            connection.close.reset_mock()
            with patch('backend_startup.http.client.HTTPConnection', return_value=connection), self.assertRaises(ValueError):
                startup._read('/agent')
            connection.close.assert_called_once()


if __name__ == '__main__':
    unittest.main()
