"""Offline gate for frozen Corpus evaluation scenarios.

It validates the scenario bank and attaches only a redacted trace/verdict.
It never calls a model, runs a tool, or turns an evaluation into an activation.
"""
from __future__ import annotations
import json
from pathlib import Path
from agent_trace import normalize
from tool_context_quality import audit as tool_context_audit

REQUIRED = frozenset({'id', 'title', 'context', 'turns', 'expected', 'failures', 'areas', 'status', 'evidence', 'user_feedback'})
VALID_STATUS = frozenset({'not_run', 'prepared', 'evaluated', 'rejected'})


def validate_bank(bank: dict) -> dict:
    if not isinstance(bank, dict) or not isinstance(bank.get('scenarios'), list):
        raise ValueError('banque de scénarios invalide')
    ids = set()
    invalid = []
    for scenario in bank['scenarios']:
        if not isinstance(scenario, dict) or not REQUIRED.issubset(scenario):
            invalid.append('champs requis manquants'); continue
        ident = scenario['id']
        if not isinstance(ident, str) or ident in ids: invalid.append('id absent ou dupliqué')
        ids.add(ident)
        if scenario['status'] not in VALID_STATUS: invalid.append(f'{ident}: statut invalide')
        for key in ('turns', 'expected', 'failures', 'areas', 'evidence'):
            if not isinstance(scenario[key], list): invalid.append(f'{ident}: {key} doit être une liste')
    return {'bank_valid': not invalid, 'scenario_count': len(bank['scenarios']), 'errors': invalid,
            'execution': 'not_performed'}


def evaluate_submission(bank: dict, submission: dict) -> dict:
    gate = validate_bank(bank)
    if not gate['bank_valid']: return gate
    if not isinstance(submission, dict): raise ValueError('soumission requise')
    scenario_id = submission.get('scenario_id')
    scenario = next((s for s in bank['scenarios'] if s['id'] == scenario_id), None)
    if scenario is None: raise ValueError('scénario inconnu')
    trace = normalize(submission.get('trace'))
    verdict = submission.get('verdict')
    if verdict not in ('pass', 'fail', 'inconclusive'):
        raise ValueError('verdict invalide')
    return {**gate, 'scenario_id': scenario_id, 'scenario_status_before': scenario['status'],
            'verdict': verdict, 'trace': trace,
            'limits': ['preuve locale fournie par le soumetteur', 'aucun modèle ni outil relancé',
                       'la qualité sémantique requiert une grille de jugement séparée']}


# Fixture materialisation remains separate from model execution.  The source bank
# carries the human-readable case; this companion freezes its exact digest and
# records that no outcome has been observed yet.
FIXTURE_SCHEMA = 'corpus.scenario-fixtures.v1'
_FIXTURE_STATUS = 'frozen_not_executed'
_DECLARED_RESULTS = frozenset({'pass', 'fail', 'inconclusive'})
_REPORTED_VERIFICATION = frozenset({'not_verified', 'reported_local_verification', 'reported_independent_verification'})


def _canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')


def _sha256(value):
    import hashlib
    return hashlib.sha256(_canonical_bytes(value)).hexdigest()


def freeze_fixtures(bank: dict) -> dict:
    """Create a digest-bound, explicitly unexecuted fixture manifest."""
    gate = validate_bank(bank)
    if not gate['bank_valid']:
        raise ValueError('Banque de scénarios invalide.')
    return {
        'schema': FIXTURE_SCHEMA,
        'source_bank_sha256': _sha256(bank),
        'fixture_status': _FIXTURE_STATUS,
        'fixtures': [{
            'id': scenario['id'],
            'scenario_sha256': _sha256(scenario),
            'fixture_status': _FIXTURE_STATUS,
            'evidence_status': 'not_collected',
            'declared_result': None,
            'verified_result': None,
        } for scenario in bank['scenarios']],
        'limits': [
            'Empreintes des cas seulement : aucune exécution de modèle ou outil.',
            'Un résultat déclaré ne devient pas vérifié par cette matérialisation.',
        ],
    }


def validate_fixtures(bank: dict, fixtures: dict) -> dict:
    """Check fixture coverage and exact provenance against the current scenario bank."""
    gate = validate_bank(bank)
    if not gate['bank_valid']:
        return {**gate, 'fixtures_valid': False, 'fixture_errors': ['source_bank_invalid']}
    errors = []
    if not isinstance(fixtures, dict) or fixtures.get('schema') != FIXTURE_SCHEMA:
        return {**gate, 'fixtures_valid': False, 'fixture_errors': ['fixture_schema_invalid']}
    if fixtures.get('source_bank_sha256') != _sha256(bank):
        errors.append('source_bank_sha256_mismatch')
    rows = fixtures.get('fixtures')
    if not isinstance(rows, list):
        errors.append('fixtures_invalid')
        rows = []
    expected = {scenario['id']: _sha256(scenario) for scenario in bank['scenarios']}
    actual = {}
    for row in rows:
        if not isinstance(row, dict) or set(row) != {'id', 'scenario_sha256', 'fixture_status', 'evidence_status', 'declared_result', 'verified_result'}:
            errors.append('fixture_shape_invalid')
            continue
        ident = row.get('id')
        if ident in actual:
            errors.append('fixture_id_duplicated:' + str(ident))
            continue
        actual[ident] = row
        if row.get('fixture_status') != _FIXTURE_STATUS:
            errors.append('fixture_status_invalid:' + str(ident))
        if row.get('evidence_status') != 'not_collected' or row.get('declared_result') is not None or row.get('verified_result') is not None:
            errors.append('fixture_not_pristine:' + str(ident))
        if expected.get(ident) != row.get('scenario_sha256'):
            errors.append('scenario_sha256_mismatch:' + str(ident))
    for ident in sorted(set(expected) - set(actual)):
        errors.append('fixture_missing:' + ident)
    for ident in sorted(set(actual) - set(expected)):
        errors.append('fixture_unknown:' + str(ident))
    return {**gate, 'fixtures_valid': not errors, 'fixture_count': len(rows),
            'fixture_errors': errors, 'execution': 'not_performed'}


def assess_fixture_submission(bank: dict, fixtures: dict, submission: dict) -> dict:
    """Attach a declared outcome without promoting it to a verified result.

    Evidence identifiers are syntax-checked only.  A separate verifier must
    inspect any referenced evidence before a verified result can be recorded.
    """
    gate = validate_fixtures(bank, fixtures)
    if not gate['fixtures_valid']:
        return gate
    if not isinstance(submission, dict):
        raise ValueError('soumission requise')
    if set(submission) - {'fixture_id', 'fixture_sha256', 'declared_result', 'trace', 'evidence'}:
        raise ValueError('champs de soumission inconnus')
    fixture_id = submission.get('fixture_id')
    fixture = next((row for row in fixtures['fixtures'] if row['id'] == fixture_id), None)
    if fixture is None or submission.get('fixture_sha256') != fixture['scenario_sha256']:
        raise ValueError('fixture absent ou empreinte périmée')
    declared = submission.get('declared_result')
    if declared not in _DECLARED_RESULTS:
        raise ValueError('declared_result invalide')
    trace = normalize(submission.get('trace'))
    evidence = submission.get('evidence', {})
    if not isinstance(evidence, dict) or set(evidence) - {'reported_verification', 'receipt_sha256'}:
        raise ValueError('evidence invalide')
    reported = evidence.get('reported_verification', 'not_verified')
    receipt = evidence.get('receipt_sha256')
    if reported not in _REPORTED_VERIFICATION:
        raise ValueError('reported_verification invalide')
    if receipt is not None and (not isinstance(receipt, str) or len(receipt) != 64 or any(ch not in '0123456789abcdef' for ch in receipt)):
        raise ValueError('receipt_sha256 invalide')
    return {
        **gate,
        'fixture_id': fixture_id,
        'declared_result': declared,
        'verified_result': None,
        'verification_state': 'not_verified_by_this_module',
        'reported_verification': reported,
        'evidence_receipt_declared': receipt is not None,
        'trace': trace,
        'promotion': 'not_performed',
        'limits': [
            'Résultat et niveau de vérification déclarés par le soumetteur ; aucun reçu n’est exécuté ou authentifié ici.',
            'verified_result reste null jusqu’à une vérification séparée, traçable et indépendante du texte final.',
            'Aucun modèle, outil, service ou configuration n’est appelé.',
        ],
    }


HERE = Path(__file__).resolve().parent
SCENARIO_BANK_PATH = HERE / 'SCENARIOS.json'
SCENARIO_FIXTURES_PATH = HERE / 'SCENARIO_FIXTURES.json'
SCENARIO_LINKS_PATH = HERE / 'TOOL_SCENARIO_LINKS.json'
TOOL_CATALOG_PATH = HERE / 'tool_router_catalog_v2.json'
TOOL_PROFILES_PATH = HERE / 'tool_profiles.json'


def evaluation_catalog(bank_path=SCENARIO_BANK_PATH, fixtures_path=SCENARIO_FIXTURES_PATH, links_path=SCENARIO_LINKS_PATH) -> dict:
    """Return the local, read-only state of frozen evaluation cases.

    This intentionally exposes only the human review contract: no model, tool,
    command, submission or verdict is started or promoted by this endpoint.
    """
    bank = json.loads(Path(bank_path).read_text(encoding='utf-8'))
    gate = validate_bank(bank)
    if not gate['bank_valid']:
        raise ValueError('banque de scénarios invalide')
    fixture_by_id = {}
    fixtures_state = 'unavailable'
    if Path(fixtures_path).is_file():
        fixtures = json.loads(Path(fixtures_path).read_text(encoding='utf-8'))
        fixtures_gate = validate_fixtures(bank, fixtures)
        fixtures_state = 'frozen' if fixtures_gate['fixtures_valid'] else 'invalid'
        if fixtures_gate['fixtures_valid']:
            fixture_by_id = {row['id']: row['fixture_status'] for row in fixtures['fixtures']}
    links = json.loads(Path(links_path).read_text(encoding='utf-8'))
    capability_report = tool_context_audit(
        json.loads(TOOL_CATALOG_PATH.read_text(encoding='utf-8')),
        json.loads(TOOL_PROFILES_PATH.read_text(encoding='utf-8')),
        bank, links,
    )
    coverage_by_id = {row['scenario_id']: row for row in capability_report['scenario_coverage']}
    profile_labels = {row['id']: row['label'] for row in capability_report['profile_budgets']}
    linked = {row['scenario_id']: row['required_namespaces'] for row in links.get('links', [])
              if isinstance(row, dict) and isinstance(row.get('scenario_id'), str)
              and isinstance(row.get('required_namespaces'), list)}
    not_applicable = set(links.get('not_applicable', [])) if isinstance(links.get('not_applicable'), list) else set()
    scenarios = []
    for scenario in bank['scenarios']:
        required_namespaces = linked.get(scenario['id'], [])
        coverage = coverage_by_id[scenario['id']]
        scenarios.append({
            'id': scenario['id'],
            'title': scenario['title'],
            'areas': scenario['areas'],
            'status': scenario['status'],
            'fixture_status': fixture_by_id.get(scenario['id'], 'not_materialized'),
            'expected': scenario['expected'],
            'failures': scenario['failures'],
            'evidence_count': len(scenario['evidence']),
            'user_feedback': scenario['user_feedback'],
            'required_namespaces': required_namespaces,
            'grader_status': 'not_recorded',
            'grader_applicable': scenario['id'] not in not_applicable,
            'capability_status': coverage['link_status'],
            'capability_purpose': coverage.get('purpose'),
            'matching_profiles': [profile_labels[item] for item in coverage.get('matching_profiles', [])],
            'profile_gap': bool(coverage.get('profile_gap', False)),
        })
    return {
        'status': bank.get('status', 'unknown'),
        'scenario_count': gate['scenario_count'],
        'fixtures': fixtures_state,
        'grader': {'status': 'ready_without_recorded_submission', 'axes': ['outils', 'politique', 'fin d’exécution', 'budget de temps']},
        'execution': 'not_performed',
        'scenarios': scenarios,
        'limits': [
            'Cette page décrit des épreuves ; elle ne mesure aucune capacité à elle seule.',
            'Aucun modèle, outil, commande ou réglage ne peut être lancé depuis cette page.',
            'Une trace ou un résultat déclaré doit être vérifié séparément avant toute conclusion.',
        ],
    }


def response(method: str, body: bytes) -> bytes:
    if method != 'GET':
        payload, status = {'error': 'Utiliser GET pour consulter les épreuves.'}, '405 Method Not Allowed'
    elif body:
        payload, status = {'error': 'Cette consultation ne reçoit aucune donnée.'}, '400 Bad Request'
    else:
        try:
            payload, status = evaluation_catalog(), '200 OK'
        except (OSError, ValueError, json.JSONDecodeError) as error:
            payload, status = {'error': 'Épreuves indisponibles : ' + str(error)}, '503 Service Unavailable'
    encoded = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    return (f'HTTP/1.1 {status}\r\nContent-Type: application/json; charset=utf-8\r\n'
            f'Content-Length: {len(encoded)}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n').encode('ascii') + encoded

def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description='Valide, fige ou évalue hors ligne une banque de scénarios Corpus.')
    parser.add_argument('bank', type=Path)
    parser.add_argument('--submission', type=Path, help='Soumission descriptive historique (compatibilité).')
    parser.add_argument('--freeze-output', type=Path, help='Écrit un manifeste de fixtures gelées ; refuse tout écrasement.')
    parser.add_argument('--fixtures', type=Path, help='Manifeste de fixtures à vérifier ou associer à une soumission.')
    parser.add_argument('--fixture-submission', type=Path, help='Résultat déclaré attaché à une fixture gelée.')
    args = parser.parse_args(argv)
    bank = json.loads(args.bank.read_text(encoding='utf-8'))
    if args.freeze_output:
        value = freeze_fixtures(bank)
        with args.freeze_output.open('x', encoding='utf-8') as output:
            json.dump(value, output, ensure_ascii=False, indent=2)
            output.write('\n')
    elif args.fixture_submission:
        if not args.fixtures:
            parser.error('--fixture-submission exige --fixtures')
        value = assess_fixture_submission(bank, json.loads(args.fixtures.read_text(encoding='utf-8')),
                                          json.loads(args.fixture_submission.read_text(encoding='utf-8')))
    elif args.fixtures:
        value = validate_fixtures(bank, json.loads(args.fixtures.read_text(encoding='utf-8')))
    else:
        value = evaluate_submission(bank, json.loads(args.submission.read_text(encoding='utf-8'))) if args.submission else validate_bank(bank)
    print(json.dumps(value, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
