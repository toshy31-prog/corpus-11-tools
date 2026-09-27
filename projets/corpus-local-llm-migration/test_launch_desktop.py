import importlib.util
import io
import json
import unittest
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = Path(__file__).with_name("launch_desktop.py")

spec = importlib.util.spec_from_file_location("launch_desktop", MODULE_PATH)
launch_desktop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launch_desktop)


class FakeResponse:
    def __init__(self, body, status=200, content_type="text/html; charset=utf-8"):
        self._body = body
        self.status = status
        self.headers = {"Content-Type": content_type}

    def read(self, _limit=-1):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class LaunchDesktopTests(unittest.TestCase):
    def test_portal_accepts_versioned_javascript_bundle(self):
        html = b"""<!doctype html>
        <html>
          <head>
            <title>Corpus local</title>
            <script src="/corpus/app-20991231.js" defer></script>
          </head>
          <body>
            <main>
              <h1 id="current-title">Corpus</h1>
              <iframe id="chat"></iframe>
            </main>
          </body>
        </html>"""

        health = json.dumps({
            "ready": True,
            "state": "ready",
        }).encode()

        responses = [
            FakeResponse(html),
            FakeResponse(health, content_type="application/json"),
        ]

        with patch.object(
            launch_desktop.urllib.request,
            "urlopen",
            side_effect=responses,
        ):
            self.assertEqual(launch_desktop.portal_state(), "ready")

    def test_portal_rejects_unrelated_html(self):
        html = b"<html><title>Not Corpus</title></html>"

        with patch.object(
            launch_desktop.urllib.request,
            "urlopen",
            return_value=FakeResponse(html),
        ):
            with self.assertRaises(ValueError):
                launch_desktop.portal_state()


if __name__ == "__main__":
    unittest.main()
