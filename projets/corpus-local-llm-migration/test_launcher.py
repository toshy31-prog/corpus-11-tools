import io
import json
import subprocess
import unittest
import urllib.error
from unittest.mock import patch

import launch_desktop as launcher


HTML = b'<title>Corpus local</title><script src="/corpus/app.js"></script><iframe id="chat"></iframe>'


class Reply(io.BytesIO):
    def __init__(self, body, status=200, content_type='application/json'):
        super().__init__(body)
        self.status = status
        self.headers = {'Content-Type': content_type}


def html():
    return Reply(HTML, content_type='text/html; charset=utf-8')


class LauncherTests(unittest.TestCase):
    def test_ready_requires_corpus_page_and_structured_health(self):
        health = Reply(json.dumps({'ready': True, 'state': 'ready'}).encode())
        with patch.object(launcher.urllib.request, 'urlopen', side_effect=[html(), health]) as request:
            self.assertEqual(launcher.portal_state(), 'ready')
        self.assertEqual([call.args[0] for call in request.call_args_list], [launcher.URL, launcher.HEALTH_URL])

    def test_structured_loading_503_can_open_portal(self):
        error = urllib.error.HTTPError(launcher.HEALTH_URL, 503, 'Starting',
                                      {'Content-Type': 'application/json'},
                                      io.BytesIO(b'{"ready":false,"state":"starting_or_unavailable"}'))
        with patch.object(launcher.urllib.request, 'urlopen', side_effect=[html(), error]):
            self.assertEqual(launcher.portal_state(), 'starting')

    def test_opencode_or_generic_html_never_counts_as_corpus(self):
        for content in [b'<title>OpenCode</title><iframe id="chat"></iframe>', b'<h1>Corpus</h1>']:
            with self.subTest(content=content), patch.object(launcher.urllib.request, 'urlopen', return_value=Reply(content, content_type='text/html')) as request:
                with self.assertRaises(ValueError):
                    launcher.portal_state()
                self.assertEqual(request.call_count, 1)

    def test_incoherent_or_non_json_health_is_not_ready(self):
        for body, status, content_type in [(b'{"ready":false,"state":"ready"}', 200, 'application/json'),
                                          (b'{"ready":true,"state":"ready"}', 503, 'application/json'),
                                          (b'[]', 200, 'application/json'),
                                          (b'<html>Error</html>', 200, 'text/html'),
                                          (b'not-json', 200, 'application/json')]:
            with self.subTest(body=body, status=status), patch.object(launcher.urllib.request, 'urlopen', side_effect=[html(), Reply(body, status, content_type)]):
                with self.assertRaises(ValueError):
                    launcher.portal_state()

    def test_unavailable_then_starting_retries_without_restarting_or_enabling(self):
        with patch.object(launcher.subprocess, 'run') as run, patch.object(launcher, 'portal_state', side_effect=[OSError('not yet'), 'starting']), patch.object(launcher.time, 'sleep') as sleep:
            self.assertEqual(launcher.main(), 0)
        self.assertEqual([call.args[0] for call in run.call_args_list], [
            ['systemctl', '--user', 'start', 'corpus-local.service'], ['xdg-open', launcher.URL]])
        sleep.assert_called_once_with(1)
        self.assertEqual(launcher.URL, 'http://127.0.0.1:18743/corpus/index.html')

    def test_service_failure_is_reported_without_opening_browser(self):
        with patch.object(launcher.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, 'systemctl')) as run, patch.object(launcher, 'show_error') as report:
            self.assertEqual(launcher.main(), 1)
        self.assertEqual(run.call_count, 1)
        self.assertIn('service Corpus', report.call_args.args[0])

    def test_startup_timeout_is_visible_without_opening_browser(self):
        with patch.object(launcher.subprocess, 'run') as run, patch.object(launcher.time, 'monotonic', side_effect=[0, 301]), patch.object(launcher, 'show_error') as report:
            self.assertEqual(launcher.main(), 1)
        self.assertEqual(run.call_count, 1)
        self.assertIn('cinq minutes', report.call_args.args[0])

    def test_browser_failure_is_reported_without_touching_service_again(self):
        with patch.object(launcher.subprocess, 'run', side_effect=[None, OSError('browser missing')]) as run, patch.object(launcher, 'portal_state', return_value='ready'), patch.object(launcher, 'show_error') as report:
            self.assertEqual(launcher.main(), 1)
        self.assertEqual(run.call_count, 2)
        self.assertIn(launcher.URL, report.call_args.args[0])

    def test_graphical_error_and_notification_fallback_are_local(self):
        with patch.object(launcher.shutil, 'which', side_effect=lambda name: '/usr/bin/' + name), patch.object(launcher.subprocess, 'run', return_value=subprocess.CompletedProcess([], 1)) as run, patch('sys.stderr', new_callable=io.StringIO):
            launcher.show_error('Erreur de test')
        self.assertEqual(run.call_args_list[0].args[0][0], '/usr/bin/zenity')
        self.assertEqual(run.call_args_list[1].args[0][:2], ['/usr/bin/notify-send', '--urgency=critical'])


if __name__ == '__main__':
    unittest.main()
