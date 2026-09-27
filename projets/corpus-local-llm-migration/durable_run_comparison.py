"""Compare two recorded durable exercises without attributing a cause.

This module reads only existing JSON receipts.  It never starts Corpus, contacts a
model, changes the runtime, or emits conversation text, paths, session IDs, or
arguments.  A time difference is reported as an observation, not as a model,
CUDA, cache, or configuration effect.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from e2e_timing import summarize


COMPARABILITY_FIELDS = (
    'same_prompt', 'same_fixture', 'same_model', 'same_runtime',
    'same_tool_profile', 'same_verifier_contract',
)


def _tool_summary(timing):
    calls = [tool for step in timing['assistant_steps'] for tool in step['tools']]
    names = sorted({str(call.get('tool')) for call in calls if isinstance(call.get('tool'), str)})
    states = {}
    for call in calls:
        status = call.get('status')
        if isinstance(status, str):
            states[status] = states.get(status, 0) + 1
    # Set membership hides an important latency confounder: ``read, edit,
    # bash`` and ``read, bash, edit`` are not the same agentic exercise even
    # if their tool names are identical.  Keep only tool names and terminal
    # states, never arguments or tool output.
    sequence = [
        {'tool': call.get('tool'), 'status': call.get('status')}
        for call in calls
        if isinstance(call.get('tool'), str)
    ]
    return {'count': len(calls), 'names': names, 'statuses': states, 'sequence': sequence}


def snapshot(receipt):
    """Return a content-free timing and terminal-state snapshot."""
    timing = summarize(receipt)
    report = receipt.get('agent_report') if isinstance(receipt, dict) else {}
    return {
        'receipt_state': receipt.get('state') if isinstance(receipt, dict) else None,
        'declared_agent_outcome': report.get('outcome') if isinstance(report, dict) else None,
        'timing': {key: timing[key] for key in (
            'wall_seconds_from_transcript', 'assistant_turn_seconds',
            'recorded_tool_execution_seconds',
            'assistant_turn_seconds_excluding_recorded_tools',
        )},
        'tools': _tool_summary(timing),
    }


def _checks(baseline, candidate, declared):
    declared = declared if isinstance(declared, dict) else {}
    checks = {}
    for field in COMPARABILITY_FIELDS:
        value = declared.get(field)
        checks[field] = value if isinstance(value, bool) else 'not_recorded'
    # A mismatch visible in the receipts makes an asserted identical tool
    # profile false.  Identical names alone do not prove identical schemas.
    if baseline['tools']['names'] != candidate['tools']['names'] or baseline['tools']['count'] != candidate['tools']['count']:
        checks['same_tool_profile'] = False
    checks['same_tool_sequence'] = baseline['tools']['sequence'] == candidate['tools']['sequence']
    checks['same_terminal_outcome'] = (
        baseline['receipt_state'] == candidate['receipt_state']
        and baseline['declared_agent_outcome'] == candidate['declared_agent_outcome']
        and baseline['receipt_state'] == 'completed'
        and baseline['declared_agent_outcome'] == 'completed'
    )
    return checks


def _readiness(snapshot):
    """Say whether one receipt is usable as a *descriptive* latency point.

    This does not establish semantic correctness.  It merely rejects a failed,
    partial, or tool-error transcript so a timeout cannot quietly become a
    performance baseline.
    """
    statuses = snapshot['tools']['statuses']
    completed_tools_only = not statuses or set(statuses) == {'completed'}
    usable = (
        snapshot['receipt_state'] == 'completed'
        and snapshot['declared_agent_outcome'] == 'completed'
        and snapshot['timing']['wall_seconds_from_transcript'] is not None
        and completed_tools_only
    )
    return {
        'usable_for_descriptive_latency': usable,
        'reason': 'completed_receipt_with_complete_tool_states' if usable else 'incomplete_or_non_terminal_receipt',
    }


def compare(baseline_receipt, candidate_receipt, *, comparability=None):
    """Describe two receipts and preserve all causal uncertainty explicitly."""
    baseline, candidate = snapshot(baseline_receipt), snapshot(candidate_receipt)
    checks = _checks(baseline, candidate, comparability)
    deltas = {}
    for key, baseline_value in baseline['timing'].items():
        candidate_value = candidate['timing'][key]
        delta = None if baseline_value is None or candidate_value is None else round(candidate_value - baseline_value, 3)
        deltas[key] = {'candidate_minus_baseline_seconds': delta}
        if baseline_value not in (None, 0) and delta is not None:
            deltas[key]['candidate_minus_baseline_pct'] = round(delta / baseline_value * 100, 3)
    baseline_readiness, candidate_readiness = _readiness(baseline), _readiness(candidate)
    comparable = (
        all(value is True for value in checks.values())
        and baseline_readiness['usable_for_descriptive_latency']
        and candidate_readiness['usable_for_descriptive_latency']
    )
    return {
        'schema': 'corpus.durable-run-comparison.v1',
        'comparison': 'descriptive_only',
        'baseline': baseline,
        'candidate': candidate,
        'delta': deltas,
        'comparability_checks': checks,
        'receipt_readiness': {'baseline': baseline_readiness, 'candidate': candidate_readiness},
        'comparability_state': 'declared_complete_but_not_independently_verified' if comparable else 'insufficient_for_attribution',
        'causal_attribution': 'not_performed',
        'runtime_change': 'none',
        'qwen_request': 'none',
        'limits': [
            'Un écart de durée ne prouve ni une régression ni une amélioration.',
            'Les reçus ne documentent pas ici le prompt, la fixture, le modèle, la configuration, ni l’état matériel ; leur identité doit être déclarée séparément.',
            'Les résultats déclarés par l’agent sont conservés séparément d’une preuve indépendante de qualité.',
            'Cette comparaison ne modifie aucune configuration et ne justifie à elle seule aucun essai supplémentaire.',
        ],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('baseline', type=Path, help='Reçu JSON de référence déjà observé.')
    parser.add_argument('candidate', type=Path, help='Second reçu JSON déjà observé.')
    parser.add_argument('--comparability', type=Path, help='Déclaration booléenne facultative des conditions de comparaison.')
    parser.add_argument('--output', type=Path, help='Fichier JSON de sortie facultatif.')
    args = parser.parse_args(argv)
    declaration = json.loads(args.comparability.read_text()) if args.comparability else None
    result = compare(json.loads(args.baseline.read_text()), json.loads(args.candidate.read_text()), comparability=declaration)
    raw = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.write_text(raw)
    print(raw, end='')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
