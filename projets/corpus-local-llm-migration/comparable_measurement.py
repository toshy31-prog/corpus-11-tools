"""Validate content-free, declarative measurements for comparable Corpus runs.

This module does not inspect a live runtime, launch a model, read a durable
receipt, collect hardware information, or persist telemetry.  It only validates
an already prepared, minimal measurement envelope.  Prompt text, session IDs,
paths, commands and tool outputs are deliberately absent from the schema.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

SCHEMA = 'corpus.comparable-measurement.v1'
_SHA256 = re.compile(r'^[0-9a-f]{64}$')
_SAFE_ID = re.compile(r'^[a-z0-9][a-z0-9._:-]{0,95}$')


def _object(value, label, keys):
    if not isinstance(value, dict) or set(value) != set(keys):
        raise ValueError(f'{label} doit contenir exactement : {", ".join(keys)}.')
    return value


def _sha(value, label):
    if not isinstance(value, str) or not _SHA256.fullmatch(value):
        raise ValueError(f'{label} doit être une empreinte SHA-256 minuscule.')
    return value


def _id(value, label):
    if not isinstance(value, str) or not _SAFE_ID.fullmatch(value):
        raise ValueError(f'{label} est invalide.')
    return value


def _integer(value, label, *, minimum=0):
    if not isinstance(value, int) or isinstance(value, bool) or value < minimum:
        raise ValueError(f'{label} doit être un entier >= {minimum}.')
    return value


def _number(value, label, *, positive=False):
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValueError(f'{label} doit être numérique.')
    value = float(value)
    if (positive and value <= 0) or (not positive and value < 0):
        raise ValueError(f'{label} est hors plage.')
    return value


def _enum(value, label, values):
    if value not in values:
        raise ValueError(f'{label} invalide.')
    return value


def validate(measurement):
    """Validate and normalize one declared, privacy-preserving run envelope."""
    root = _object(measurement, 'measurement', (
        'schema', 'model', 'runtime', 'gpu', 'cache', 'task', 'outcome',
    ))
    if root['schema'] != SCHEMA:
        raise ValueError('schema incompatible.')

    model = _object(root['model'], 'model', ('provider_id', 'model_id', 'quantization', 'model_sha256'))
    for field in ('provider_id', 'model_id', 'quantization'):
        _id(model[field], 'model.' + field)
    _sha(model['model_sha256'], 'model.model_sha256')

    runtime = _object(root['runtime'], 'runtime', ('engine', 'engine_version', 'context_tokens', 'configuration_sha256'))
    _id(runtime['engine'], 'runtime.engine')
    _id(runtime['engine_version'], 'runtime.engine_version')
    _integer(runtime['context_tokens'], 'runtime.context_tokens', minimum=1)
    _sha(runtime['configuration_sha256'], 'runtime.configuration_sha256')

    gpu = _object(root['gpu'], 'gpu', ('backend', 'accelerator_fingerprint_sha256', 'vram_mib'))
    _enum(gpu['backend'], 'gpu.backend', {'cuda', 'rocm', 'metal', 'cpu', 'unknown'})
    _sha(gpu['accelerator_fingerprint_sha256'], 'gpu.accelerator_fingerprint_sha256')
    _integer(gpu['vram_mib'], 'gpu.vram_mib')

    cache = _object(root['cache'], 'cache', ('state_before', 'prefix_identity_sha256', 'reported_read_tokens'))
    _enum(cache['state_before'], 'cache.state_before', {'cold', 'warm', 'unknown'})
    _sha(cache['prefix_identity_sha256'], 'cache.prefix_identity_sha256')
    if cache['reported_read_tokens'] is not None:
        _integer(cache['reported_read_tokens'], 'cache.reported_read_tokens')

    task = _object(root['task'], 'task', ('prompt_sha256', 'fixture_sha256', 'tool_profile_sha256', 'verifier_contract_sha256'))
    for field in task:
        _sha(task[field], 'task.' + field)

    outcome = _object(root['outcome'], 'outcome', ('terminal', 'verification', 'wall_seconds', 'tool_sequence'))
    _enum(outcome['terminal'], 'outcome.terminal', {'completed', 'failed', 'cancelled', 'unknown'})
    _enum(outcome['verification'], 'outcome.verification', {
        'receipt_chain_verified', 'receipt_chain_unverified', 'not_verified',
    })
    _number(outcome['wall_seconds'], 'outcome.wall_seconds', positive=True)
    if not isinstance(outcome['tool_sequence'], list):
        raise ValueError('outcome.tool_sequence doit être une liste.')
    normalized_tools = []
    for index, item in enumerate(outcome['tool_sequence']):
        item = _object(item, f'outcome.tool_sequence[{index}]', ('tool', 'status'))
        normalized_tools.append({
            'tool': _id(item['tool'], f'outcome.tool_sequence[{index}].tool'),
            'status': _enum(item['status'], f'outcome.tool_sequence[{index}].status', {'completed', 'failed', 'cancelled', 'pending'}),
        })

    return {
        'schema': SCHEMA,
        'model': dict(model), 'runtime': dict(runtime), 'gpu': dict(gpu),
        'cache': dict(cache), 'task': dict(task),
        'outcome': {**outcome, 'wall_seconds': _number(outcome['wall_seconds'], 'outcome.wall_seconds', positive=True), 'tool_sequence': normalized_tools},
    }


def compare_identities(baseline, candidate):
    """Compare two valid envelopes; never attribute their elapsed-time delta."""
    baseline, candidate = validate(baseline), validate(candidate)
    fields = (
        ('model', 'provider_id'), ('model', 'model_id'), ('model', 'quantization'), ('model', 'model_sha256'),
        ('runtime', 'engine'), ('runtime', 'engine_version'), ('runtime', 'context_tokens'), ('runtime', 'configuration_sha256'),
        ('gpu', 'backend'), ('gpu', 'accelerator_fingerprint_sha256'), ('gpu', 'vram_mib'),
        ('cache', 'state_before'), ('cache', 'prefix_identity_sha256'),
        ('task', 'prompt_sha256'), ('task', 'fixture_sha256'), ('task', 'tool_profile_sha256'), ('task', 'verifier_contract_sha256'),
        ('outcome', 'tool_sequence'),
    )
    mismatches = [f'{section}.{field}' for section, field in fields if baseline[section][field] != candidate[section][field]]
    terminal_ok = all(item['outcome']['terminal'] == 'completed' and item['outcome']['verification'] == 'receipt_chain_verified'
                      for item in (baseline, candidate))
    delta = round(candidate['outcome']['wall_seconds'] - baseline['outcome']['wall_seconds'], 3)
    return {
        'schema': 'corpus.comparable-measurement-comparison.v1',
        'comparison': 'declarative_identity_only',
        'identity_mismatches': mismatches,
        'terminal_invariants_met': terminal_ok,
        'comparability_state': 'declared_comparable_not_causally_attributed' if not mismatches and terminal_ok else 'insufficient_for_attribution',
        'wall_seconds': {'baseline': baseline['outcome']['wall_seconds'], 'candidate': candidate['outcome']['wall_seconds'], 'candidate_minus_baseline': delta},
        'causal_attribution': 'not_performed',
        'limits': [
            'Les identités sont déclaratives : ce module ne les observe pas dans le runtime.',
            'Aucun contenu de prompt, identifiant de session, chemin, commande ou sortie d’outil ne fait partie du reçu.',
            'Une comparaison déclarée complète ne prouve ni un effet du cache ni une qualité générale.',
        ],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('measurement', type=Path)
    parser.add_argument('--compare-to', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args(argv)
    current = json.loads(args.measurement.read_text())
    result = compare_identities(json.loads(args.compare_to.read_text()), current) if args.compare_to else validate(current)
    raw = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.write_text(raw)
    print(raw, end='')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
