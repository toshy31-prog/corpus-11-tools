"""Evaluate a recorded Corpus performance experiment without starting a service.

The input is an evidence manifest written after two separately observed runs.
This module never imports runtime configuration, opens a socket, launches a
process, or asks a model to answer.  Its conclusion only says whether the
candidate is eligible for human review; it does not activate a candidate.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


DEFAULT_IMMUTABLES = (
    'engine', 'engine_version', 'model', 'model_sha256', 'quantization',
    'context_tokens', 'prompt_sha256', 'tool_profile_sha256', 'fixture_sha256',
)


def _number(value, label, *, positive=False):
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValueError(f'{label} doit être numérique.')
    value = float(value)
    if (positive and value <= 0) or not positive and value < 0:
        raise ValueError(f'{label} est hors plage.')
    return value


def _mapping(value, label):
    if not isinstance(value, dict):
        raise ValueError(f'{label} doit être un objet.')
    return value


def _run(name, value):
    run = _mapping(value, f'run {name}')
    configuration = _mapping(run.get('configuration'), f'{name}.configuration')
    environment = _mapping(run.get('environment'), f'{name}.environment')
    timing = _mapping(run.get('timing'), f'{name}.timing')
    verification = _mapping(run.get('verification'), f'{name}.verification')
    runtime = _mapping(run.get('runtime'), f'{name}.runtime')
    return {
        'configuration': configuration,
        'environment': environment,
        'wall_seconds': _number(timing.get('wall_seconds_from_transcript'),
                                f'{name}.timing.wall_seconds_from_transcript', positive=True),
        'chain_verified': verification.get('execution_chain_verified') is True,
        'terminal': runtime.get('terminal') == 'completed',
        'service_ready_after': runtime.get('service_health_after') == 'ready',
        'cuda_error_free': runtime.get('cuda_errors') == [],
    }


def evaluate(manifest):
    """Return a deterministic, read-only verdict for one A/B experiment."""
    manifest = _mapping(manifest, 'manifest')
    variation = _mapping(manifest.get('variation'), 'variation')
    key = variation.get('key')
    if not isinstance(key, str) or not key or len(key) > 80:
        raise ValueError('variation.key est requis.')
    baseline_value, candidate_value = variation.get('baseline'), variation.get('candidate')
    if baseline_value == candidate_value:
        raise ValueError('Les deux valeurs de variation doivent différer.')
    threshold = _number(manifest.get('minimum_wall_reduction_pct', 10),
                        'minimum_wall_reduction_pct')
    if threshold > 95:
        raise ValueError('minimum_wall_reduction_pct est irréaliste.')
    baseline = _run('baseline', manifest.get('baseline'))
    candidate = _run('candidate', manifest.get('candidate'))
    if baseline['configuration'].get(key) != baseline_value:
        raise ValueError('La valeur baseline ne correspond pas à variation.')
    if candidate['configuration'].get(key) != candidate_value:
        raise ValueError('La valeur candidate ne correspond pas à variation.')

    immutable_fields = manifest.get('immutable_fields', list(DEFAULT_IMMUTABLES))
    if not isinstance(immutable_fields, list) or not immutable_fields or not all(isinstance(x, str) and x for x in immutable_fields):
        raise ValueError('immutable_fields invalide.')
    environment_mismatches = [field for field in immutable_fields
                              if field not in baseline['environment']
                              or field not in candidate['environment']
                              or baseline['environment'][field] != candidate['environment'][field]]
    # A/B means exactly one configuration difference.  Missing values are a
    # mismatch too, so an omitted changing flag cannot be hidden.
    keys = set(baseline['configuration']) | set(candidate['configuration'])
    configuration_mismatches = sorted(field for field in keys if field != key
                                      and baseline['configuration'].get(field) != candidate['configuration'].get(field))
    reduction = round((1 - candidate['wall_seconds'] / baseline['wall_seconds']) * 100, 3)
    functional_failures = [name for name, run in (('baseline', baseline), ('candidate', candidate))
                           if not run['chain_verified'] or not run['terminal']]
    runtime_failures = []
    # A degraded baseline is no more a usable comparison than a degraded
    # candidate: a speed ratio cannot establish an improvement if either side
    # ended with an unavailable service or a CUDA error.
    for name, run in (('baseline', baseline), ('candidate', candidate)):
        if not run['service_ready_after']:
            runtime_failures.append(
                'service_not_ready_after' if name == 'candidate'
                else 'baseline_service_not_ready_after'
            )
        if not run['cuda_error_free']:
            runtime_failures.append(
                'cuda_error_observed' if name == 'candidate'
                else 'baseline_cuda_error_observed'
            )

    blocking = []
    if environment_mismatches:
        blocking.append('environment_changed:' + ','.join(environment_mismatches))
    if configuration_mismatches:
        blocking.append('multiple_configuration_changes:' + ','.join(configuration_mismatches))
    if functional_failures:
        blocking.append('functional_invariant_failed:' + ','.join(functional_failures))
    if runtime_failures:
        blocking.extend(runtime_failures)
    if blocking:
        outcome = 'rollback_recommended'
    elif reduction < threshold:
        outcome = 'inconclusive'
    else:
        outcome = 'eligible_for_human_review'
    return {
        'experiment': manifest.get('experiment', 'unnamed'),
        'variation': {'key': key, 'baseline': baseline_value, 'candidate': candidate_value},
        'wall_seconds': {'baseline': baseline['wall_seconds'], 'candidate': candidate['wall_seconds']},
        'wall_reduction_pct': reduction,
        'minimum_wall_reduction_pct': threshold,
        'outcome': outcome,
        'blocking_reasons': blocking,
        'limits': [
            'lecture de reçus uniquement : aucune inférence, aucun service, aucune configuration modifiée',
            'le verdict ne prouve ni qualité générale ni autonomie générale',
            'eligible_for_human_review ne vaut ni activation ni déploiement',
        ],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path, help='Manifest JSON de deux épreuves déjà observées.')
    parser.add_argument('--output', type=Path, help='Écrit le verdict JSON (facultatif).')
    args = parser.parse_args(argv)
    verdict = evaluate(json.loads(args.manifest.read_text()))
    raw = json.dumps(verdict, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.write_text(raw)
    print(raw, end='')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
