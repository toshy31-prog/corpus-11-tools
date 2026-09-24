"""Démarrer le service utilisateur puis ouvrir le portail Corpus vérifié."""
import json
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request

URL = 'http://127.0.0.1:18743/corpus/index.html'
HEALTH_URL = 'http://127.0.0.1:18743/corpus/api/health'
STARTUP_TIMEOUT = 300


def portal_state():
    """Accept only Corpus HTML and its health contract, without running a turn."""
    with urllib.request.urlopen(URL, timeout=2) as response:
        page = response.read(1_000_001)
        if response.status != 200 or 'text/html' not in response.headers.get('Content-Type', ''):
            raise ValueError('La page Corpus est indisponible.')
        if len(page) > 1_000_000 or not all(marker in page for marker in (
            b'<title>Corpus local</title>', b'id="chat"', b'src="/corpus/app.js"'
        )):
            raise ValueError('La réponse reçue n’est pas le portail Corpus.')
    try:
        response = urllib.request.urlopen(HEALTH_URL, timeout=2)
    except urllib.error.HTTPError as error:
        # The portal handles a model that is still loading. A structured 503 is
        # sufficient to show that loading state instead of leaving the desktop silent.
        if error.code != 503:
            raise
        response = error
    with response:
        raw = response.read(65_537)
        if len(raw) > 65_536 or 'application/json' not in response.headers.get('Content-Type', ''):
            raise ValueError('Le diagnostic de démarrage Corpus est invalide.')
        health = json.loads(raw)
        if not isinstance(health, dict):
            raise ValueError('Le diagnostic de démarrage Corpus est invalide.')
        if response.status == 200 and health.get('ready') is True and health.get('state') == 'ready':
            return 'ready'
        if response.status == 503 and health.get('ready') is False and health.get('state') == 'starting_or_unavailable':
            return 'starting'
        raise ValueError('Le service Corpus n’a pas confirmé son état de démarrage.')


def show_error(message):
    text = message + '\n\nAucune conversation n’a été effacée. Réessaie le raccourci Corpus ou consulte les journaux de corpus-local.service.'
    print(text, file=sys.stderr)
    zenity = shutil.which('zenity')
    if zenity:
        try:
            result = subprocess.run([zenity, '--error', '--title=Corpus — ouverture impossible', '--text=' + text],
                                    timeout=60, capture_output=True)
            if result.returncode == 0:
                return
        except (OSError, subprocess.SubprocessError):
            pass
    notify = shutil.which('notify-send')
    if notify:
        try:
            subprocess.run([notify, '--urgency=critical', 'Corpus — ouverture impossible', text],
                           timeout=5, capture_output=True)
        except (OSError, subprocess.SubprocessError):
            pass

def main():
    try:
        subprocess.run(['systemctl', '--user', 'start', 'corpus-local.service'],
                       check=True, timeout=30, capture_output=True)
    except (OSError, subprocess.SubprocessError):
        show_error('Le service Corpus n’a pas pu démarrer.')
        return 1
    deadline = time.monotonic() + STARTUP_TIMEOUT
    while time.monotonic() < deadline:
        try:
            portal_state()
        except (OSError, ValueError):
            time.sleep(1)
            continue
        try:
            subprocess.run(['xdg-open', URL], check=True, timeout=30, capture_output=True)
            return 0
        except (OSError, subprocess.SubprocessError):
            show_error('Corpus répond, mais le navigateur n’a pas pu s’ouvrir. Adresse : ' + URL)
            return 1
    show_error('Corpus n’a pas confirmé son démarrage après cinq minutes.')
    return 1

if __name__ == '__main__':
    raise SystemExit(main())
