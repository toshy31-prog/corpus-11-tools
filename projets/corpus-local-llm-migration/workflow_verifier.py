"""Read-only verification of the fixed local read/edit/test exercise.

The model transcript is evidence of tool calls, not authority to execute them
again.  This module combines the bounded receipt check with a separate current
filesystem observation.  Neither result judges the semantic quality of an
assistant answer.
"""
from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path

from workflow_receipt import evaluate

HERE = Path(__file__).resolve().parent
PROFILE_ID = 'migration-smoke-v1'
CONTEXT = HERE / 'CONTEXTE_LOCAL.md'
FIXTURE = HERE / '.migration-smoke/runtime_limits.py'
TEST = HERE / '.migration-smoke/test_budget.py'
BASELINE = HERE / '.migration-smoke/scoped-before.json'
MAX_CALLS = 100
MAX_TEXT = 12_000


def sha256(path: Path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(65_536), b''):
            digest.update(block)
    return digest.hexdigest()


def text(value, limit):
    return value if isinstance(value, str) and len(value) <= limit else None


def clean_call(value):
    if not isinstance(value, dict):
        raise ValueError('Appel d’outil invalide.')
    tool = text(value.get('tool'), 80)
    state = value.get('state')
    if tool is None or not isinstance(state, dict):
        raise ValueError('Appel d’outil incomplet.')
    status = text(state.get('status'), 32)
    if status is None:
        raise ValueError('État d’outil invalide.')
    source = state.get('input', {})
    if not isinstance(source, dict):
        raise ValueError('Entrée d’outil invalide.')
    data = {}
    for key in ('filePath', 'command'):
        item = text(source.get(key), 4_000)
        if item is not None:
            data[key] = item
    cleaned = {'tool': tool, 'state': {'status': status, 'input': data}}
    output = text(state.get('output'), MAX_TEXT)
    if output is not None:
        cleaned['state']['output'] = output
    metadata = state.get('metadata', {})
    if isinstance(metadata, dict) and isinstance(metadata.get('exit'), int):
        cleaned['state']['metadata'] = {'exit': metadata['exit']}
    return cleaned


def report_from_payload(data):
    if not isinstance(data, dict) or data.get('profile') != PROFILE_ID:
        raise ValueError('Profil de vérification inconnu.')
    report = data.get('report')
    if not isinstance(report, dict):
        raise ValueError('Rapport de conversation requis.')
    outcome = text(report.get('outcome'), 48)
    if outcome not in ('completed', 'interrupted', 'unknown'):
        raise ValueError('Fin de conversation invalide.')
    calls = report.get('tool_calls')
    if not isinstance(calls, list) or len(calls) > MAX_CALLS:
        raise ValueError('Nombre d’appels d’outils invalide.')
    elapsed = report.get('elapsed_seconds')
    if elapsed is not None and (not isinstance(elapsed, (int, float)) or isinstance(elapsed, bool) or not 0 <= elapsed <= 86_400):
        raise ValueError('Durée invalide.')
    return {'outcome': outcome, 'elapsed_seconds': elapsed,
            'tool_calls': [clean_call(call) for call in calls]}


def current_fixture():
    result = {'path': str(FIXTURE), 'exists': FIXTURE.is_file(),
              'state': 'unobserved'}
    if not result['exists']:
        result['state'] = 'missing'
        return result
    raw = FIXTURE.read_bytes()
    result['sha256'] = hashlib.sha256(raw).hexdigest()
    try:
        baseline = json.loads(BASELINE.read_text()).get('.migration-smoke/runtime_limits.py')
    except (OSError, ValueError, AttributeError):
        baseline = None
    result['matches_initial_baseline'] = isinstance(baseline, str) and result['sha256'] == baseline
    try:
        tree = ast.parse(raw.decode('utf-8'))
        result['declares_fits_context'] = any(
            isinstance(node, ast.FunctionDef) and node.name == 'fits_context' and
            [arg.arg for arg in node.args.args] == ['input_tokens', 'output_tokens']
            for node in tree.body)
        result['state'] = 'readable'
    except (SyntaxError, UnicodeDecodeError):
        result['declares_fits_context'] = False
        result['state'] = 'invalid_python'
    return result


def verify(data):
    report = report_from_payload(data)
    receipt = evaluate(report, context_path=str(CONTEXT), fixture_path=str(FIXTURE),
                       test_command='python3 ' + str(TEST))
    fixture = current_fixture()
    return {
        'profile': PROFILE_ID,
        'execution_receipt': receipt,
        'current_fixture': fixture,
        'conclusion': ('chaîne d’exécution vérifiée par les reçus ; réponse à relire séparément'
                       if receipt['execution_chain_verified']
                       else 'chaîne d’exécution non vérifiée ; voir les étapes manquantes'),
        'limits': ['aucune commande n’est relancée', 'la lecture du fichier est actuelle, les reçus décrivent le tour passé',
                   'la correction sémantique de la réponse reste à examiner'],
    }


def durable_payload(data):
    if not isinstance(data, dict) or not isinstance(data.get('agent_report'), dict):
        raise ValueError('Rapport durable absent ou invalide.')
    report = dict(data['agent_report'])
    started, finished = data.get('started_at'), data.get('finished_at')
    if (isinstance(started, (int, float)) and not isinstance(started, bool)
            and isinstance(finished, (int, float)) and not isinstance(finished, bool)
            and 0 <= finished - started <= 86_400):
        report['elapsed_seconds'] = round(finished - started, 3)
    return {'profile': PROFILE_ID, 'report': report}


def response(method, body):
    try:
        if method != 'POST':
            raise ValueError('POST requis.')
        value, status = verify(json.loads(body)), '200 OK'
    except (ValueError, TypeError, OSError, json.JSONDecodeError) as error:
        value, status = {'error': str(error)}, '400 Bad Request'
    raw = json.dumps(value, ensure_ascii=False).encode()
    return (f'HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\n'
            f'Content-Length: {len(raw)}\r\nConnection: close\r\n\r\n').encode() + raw


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description='Vérifie des reçus locaux sans relancer le modèle ni les outils.')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--payload', type=Path, help='Payload déjà formé pour la vérification.')
    group.add_argument('--durable-result', type=Path, help='Résultat du lanceur durable.')
    args = parser.parse_args(argv)
    source = json.loads((args.payload or args.durable_result).read_text())
    value = verify(source if args.payload else durable_payload(source))
    print(json.dumps(value, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
