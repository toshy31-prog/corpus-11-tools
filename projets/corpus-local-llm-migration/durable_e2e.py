"""Durable, single-submit recorder for a bounded local agent exercise.

It records the session id before prompt submission and never resubmits it.
The process can therefore be launched independently of a browser/client.
"""
import argparse
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    os.replace(temporary, path)


def terminal(messages, user_id):
    rows = [row.get('info', {}) for row in messages if isinstance(row, dict)
            and row.get('info', {}).get('role') == 'assistant'
            and row.get('info', {}).get('parentID') == user_id]
    if not rows:
        return None
    latest = rows[-1]
    if latest.get('error') or latest.get('finish') in ('unknown', 'other', 'error'):
        return 'abnormal'
    if latest.get('time', {}).get('completed') and latest.get('finish'):
        return 'completed'
    return None


def agent_report(messages):
    """Normalize the last direct turn without treating it as verified evidence."""
    if not isinstance(messages, list):
        return {'outcome': 'unknown', 'tool_calls': []}
    users = [row for row in messages if isinstance(row, dict) and row.get('info', {}).get('role') == 'user']
    if not users:
        return {'outcome': 'unknown', 'tool_calls': []}
    user = users[-1].get('info', {})
    turns = [row for row in messages if isinstance(row, dict)
             and row.get('info', {}).get('role') == 'assistant'
             and row.get('info', {}).get('parentID') == user.get('id')]
    last = turns[-1].get('info', {}) if turns else {}
    finish = last.get('finish')
    if last.get('time', {}).get('completed') and not last.get('error') and finish in ('stop', 'end_turn'):
        outcome = 'completed'
    elif last.get('error') or finish in ('unknown', 'other', 'error'):
        outcome = 'interrupted'
    else:
        outcome = 'unknown'
    calls = [
        {'tool': str(part.get('tool', '')), 'state': part.get('state', {})}
        for turn in turns for part in turn.get('parts', [])
        if isinstance(part, dict) and part.get('type') == 'tool' and isinstance(part.get('state'), dict)
    ][:100]
    return {'outcome': outcome, 'tool_calls': calls}


def record_error(result, phase, error):
    result.setdefault('errors', []).append({
        'phase': phase,
        'message': str(error)[:1_000],
        'at': time.time(),
    })


def run(request, message, result_path, *, title, directory, deadline=600, poll_delay=3, clock=time.monotonic, sleep=time.sleep):
    """Run once with an injectable request function for deterministic tests."""
    result = {'state': 'creating', 'started_at': time.time(), 'deadline_seconds': deadline}
    atomic_json(result_path, result)
    try:
        session = request('POST', '/session', {'title': title}, directory)
    except Exception as error:
        record_error(result, 'create_session', error)
        result.update(state='create_failed', finished_at=time.time())
        atomic_json(result_path, result)
        return result
    ident = session.get('id') if isinstance(session, dict) else None
    if not isinstance(ident, str):
        result.update(state='create_failed', session=session, finished_at=time.time())
        atomic_json(result_path, result)
        return result
    result.update(state='created', session_id=ident)
    atomic_json(result_path, result)
    try:
        request('POST', '/session/' + ident + '/prompt_async', message, directory)
        result['state'] = 'submitted'
    except Exception as error:
        # The server may have received the request before a broken connection.
        # Never resend it; record the ambiguity and inspect the session instead.
        result['state'] = 'submit_uncertain'
        record_error(result, 'submit_prompt', error)
    atomic_json(result_path, result)
    end = clock() + deadline
    while clock() < end:
        try:
            messages = request('GET', '/session/' + ident + '/message', None, directory)
        except Exception as error:
            record_error(result, 'poll_messages', error)
            atomic_json(result_path, result)
            sleep(poll_delay)
            continue
        if not isinstance(messages, list):
            record_error(result, 'poll_messages', 'Réponse de messages invalide.')
            atomic_json(result_path, result)
            sleep(poll_delay)
            continue
        user = next((row.get('info', {}).get('id') for row in messages if row.get('info', {}).get('role') == 'user'), None)
        state = terminal(messages, user) if user else None
        result.update(messages=messages, agent_report=agent_report(messages), state=state or 'waiting')
        atomic_json(result_path, result)
        if state:
            result['finished_at'] = time.time(); atomic_json(result_path, result); return result
        sleep(poll_delay)
    try:
        request('POST', '/session/' + ident + '/abort', {}, directory)
    except Exception as error:
        result['abort_error'] = str(error)
    result.update(state='deadline', finished_at=time.time())
    atomic_json(result_path, result)
    return result


def local_request(base_url):
    """Make one bounded JSON request to the local Corpus service only."""
    parsed = urllib.parse.urlsplit(base_url)
    if parsed.scheme != 'http' or parsed.hostname not in ('127.0.0.1', 'localhost') or parsed.port != 18743:
        raise ValueError('Le lanceur durable accepte seulement http://127.0.0.1:18743.')
    root = base_url.rstrip('/')

    def request(method, path, body, directory):
        if method not in ('GET', 'POST') or not path.startswith('/'):
            raise ValueError('Requête locale invalide.')
        headers = {'Accept': 'application/json', 'x-opencode-directory': str(directory)}
        data = None
        if body is not None:
            data = json.dumps(body, ensure_ascii=False).encode('utf-8')
            headers['Content-Type'] = 'application/json'
        wire = urllib.request.Request(root + path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(wire, timeout=30) as response:
                raw = response.read(2_000_001)
                status = response.status
        except urllib.error.HTTPError as error:
            raw = error.read(20_001)
            raise RuntimeError('HTTP %s : %s' % (error.code, raw.decode('utf-8', 'replace')[:1_000])) from error
        # OpenCode acknowledges prompt_async with 204 No Content.  It means
        # the prompt was accepted, not an ambiguous transport failure.
        if status == 204:
            return {}
        if status not in (200, 201) or len(raw) > 2_000_000:
            raise RuntimeError('Réponse locale invalide (%s).' % status)
        try:
            return json.loads(raw)
        except json.JSONDecodeError as error:
            raise RuntimeError('La réponse locale n’est pas du JSON.') from error

    return request


def parse_message(path):
    path = Path(path)
    if not path.is_file() or path.stat().st_size > 100_000:
        raise ValueError('Message d’épreuve absent ou trop volumineux.')
    value = json.loads(path.read_text())
    if not isinstance(value, dict) or not isinstance(value.get('parts'), list) or not isinstance(value.get('tools'), dict):
        raise ValueError('Message d’épreuve invalide.')
    return value


def main(argv=None):
    parser = argparse.ArgumentParser(description='Exécute une épreuve Corpus une seule fois et conserve son reçu local.')
    parser.add_argument('--message', required=True, help='JSON du message préparé.')
    parser.add_argument('--result', required=True, help='JSON de résultat écrit atomiquement.')
    parser.add_argument('--directory', default=str(Path(__file__).resolve().parents[2]), help='Projet Corpus ciblé.')
    parser.add_argument('--title', default='Épreuve Corpus bornée', help='Titre de la session locale.')
    parser.add_argument('--deadline', type=int, default=600, choices=range(1, 3601), metavar='SECONDES')
    parser.add_argument('--poll-delay', type=int, default=3, choices=range(1, 61), metavar='SECONDES')
    parser.add_argument('--base-url', default='http://127.0.0.1:18743')
    args = parser.parse_args(argv)
    result = run(local_request(args.base_url), parse_message(args.message), args.result,
                 title=args.title, directory=args.directory, deadline=args.deadline,
                 poll_delay=args.poll_delay)
    print(json.dumps({'state': result['state'], 'session_id': result.get('session_id')}, ensure_ascii=False))
    return 0 if result['state'] == 'completed' else 1


if __name__ == '__main__':
    raise SystemExit(main())
