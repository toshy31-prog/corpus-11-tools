"""Vérifie hors exécution le reçu durable isolé V2.

Ce vérificateur lit un résultat déjà produit : il ne relance ni le modèle, ni
le test, ni les outils. Il vérifie la chaîne bornée lecture -> édition -> test,
la cible et le marqueur de résultat attendus.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
from pathlib import Path

from workflow_receipt import evaluate

HERE = Path(__file__).resolve().parent
PROFILE_ID = 'migration-smoke-v2'
CONTEXT = HERE / 'CONTEXTE_LOCAL.md'
FIXTURE = HERE / '.migration-smoke/runtime_limits_v2.py'
TEST = HERE / '.migration-smoke/test_budget_v2.py'
MARKER = 'MIGRATION_SMOKE_V2_PASS'
TEST_COMMAND = 'python3 ' + str(TEST)


def current_fixture():
    """Observation actuelle de la fixture, séparée du reçu historique."""
    result = {'path': str(FIXTURE), 'exists': FIXTURE.is_file(), 'state': 'unobserved'}
    if not result['exists']:
        result['state'] = 'missing'
        return result
    raw = FIXTURE.read_bytes()
    result['sha256'] = hashlib.sha256(raw).hexdigest()
    try:
        tree = ast.parse(raw.decode('utf-8'))
        result['declares_fits_context'] = any(
            isinstance(node, ast.FunctionDef) and node.name == 'fits_context'
            and [arg.arg for arg in node.args.args] == ['input_tokens', 'output_tokens']
            for node in tree.body)
        result['state'] = 'readable'
    except (SyntaxError, UnicodeDecodeError):
        result['declares_fits_context'] = False
        result['state'] = 'invalid_python'
    return result


def durable_report(data):
    if not isinstance(data, dict) or not isinstance(data.get('agent_report'), dict):
        raise ValueError('Rapport durable V2 absent ou invalide.')
    report = dict(data['agent_report'])
    started, finished = data.get('started_at'), data.get('finished_at')
    if (isinstance(started, (int, float)) and not isinstance(started, bool)
            and isinstance(finished, (int, float)) and not isinstance(finished, bool)
            and 0 <= finished - started <= 86_400):
        report['elapsed_seconds'] = round(finished - started, 3)
    return report


def verify(data):
    receipt = evaluate(durable_report(data), context_path=str(CONTEXT),
                       fixture_path=str(FIXTURE), test_command=TEST_COMMAND,
                       success_marker=MARKER)
    fixture = current_fixture()
    verified = receipt['execution_chain_verified']
    return {
        'profile': PROFILE_ID,
        'verification_state': 'receipt_chain_verified' if verified else 'receipt_chain_unverified',
        'execution_receipt': receipt,
        'target': {'fixture_path': str(FIXTURE), 'test_command': TEST_COMMAND,
                   'success_marker': MARKER},
        'current_fixture': fixture,
        'conclusion': ('Le reçu V2 établit la chaîne bornée et le test exact rapporté.'
                       if verified else 'Le reçu V2 ne permet pas d’établir la chaîne bornée.'),
        'limits': [
            'lecture seule : aucune commande, aucun outil et aucun modèle ne sont relancés',
            'le reçu atteste les états d’outils rapportés, pas une observation indépendante de leur exécution',
            'la fixture observée est l’état courant ; son empreinte ne reconstitue pas seule l’état exact au moment du test',
            'ce contrôle ne valide ni la migration complète ni des effets hors de cette fixture isolée',
        ],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('durable_result', type=Path)
    args = parser.parse_args(argv)
    print(json.dumps(verify(json.loads(args.durable_result.read_text())), ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
