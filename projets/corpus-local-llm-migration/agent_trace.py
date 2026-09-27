"""Local, redacted traces for Corpus agent runs.

The format borrows the useful shape of OTel/OpenInference (a root run and
ordered model/tool/retrieval spans) without importing their SDKs or exporting
data.  It deliberately rejects prompt, completion, command, path and session
content: a trace is operational evidence, never a conversation archive.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

SCHEMA_VERSION = 'corpus.agent-trace.v1'
ALLOWED_KINDS = frozenset({'run', 'model', 'tool', 'retrieval', 'guardrail', 'evaluation'})
ALLOWED_STATUS = frozenset({'ok', 'error', 'cancelled', 'unknown'})
_FORBIDDEN = re.compile(r'(prompt|message|content|text|command|file|path|session|output|input)', re.I)


def _trace_fingerprint(run: dict, spans: list[dict]) -> str:
    """Correlate a redacted evidence packet, never its source/run ID.

    Hashing a session identifier creates a durable pseudonymous session handle.
    The trace ID instead comes only from already-redacted operational fields.
    It can compare copies of one evidence packet without exporting a session or
    message identifier.
    """
    packet = {'run': run, 'spans': spans}
    encoded = json.dumps(packet, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(encoded).hexdigest()[:24]


def _number(value, name: str, minimum=0):
    if not isinstance(value, (int, float)) or isinstance(value, bool) or value < minimum:
        raise ValueError(f'{name} invalide')
    return value


def _attributes(value):
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError('attributs invalides')
    cleaned = {}
    for key, item in value.items():
        if not isinstance(key, str) or _FORBIDDEN.search(key):
            raise ValueError('attribut sensible ou inconnu')
        if isinstance(item, bool) or isinstance(item, (int, float)) or item is None:
            cleaned[key] = item
        elif isinstance(item, str) and len(item) <= 96 and re.fullmatch(r'[a-zA-Z0-9._:/@-]+', item):
            cleaned[key] = item
        else:
            raise ValueError('valeur d’attribut invalide')
    return cleaned


def normalize(raw: dict) -> dict:
    """Validate and redact a trace supplied by a local adapter.

    Durations are monotonic offsets; wall-clock timestamps are intentionally
    absent.  This prevents the trace becoming a person/activity log.
    """
    if not isinstance(raw, dict):
        raise ValueError('trace requise')
    run = raw.get('run')
    if not isinstance(run, dict):
        raise ValueError('run requis')
    source = run.get('id')
    if not isinstance(source, str) or not source or len(source) > 512:
        raise ValueError('identifiant de run invalide')
    spans = raw.get('spans')
    if not isinstance(spans, list) or len(spans) > 200:
        raise ValueError('spans invalides')
    result = []
    last_start = -1
    for index, span in enumerate(spans):
        if not isinstance(span, dict):
            raise ValueError('span invalide')
        kind = span.get('kind')
        status = span.get('status', 'unknown')
        start = _number(span.get('start_ms'), 'start_ms')
        duration = _number(span.get('duration_ms'), 'duration_ms')
        if kind not in ALLOWED_KINDS or status not in ALLOWED_STATUS or start < last_start:
            raise ValueError('ordre ou type de span invalide')
        last_start = start
        result.append({
            'span_id': f's{index + 1}', 'kind': kind, 'status': status,
            'start_ms': round(start, 3), 'duration_ms': round(duration, 3),
            'attributes': _attributes(span.get('attributes')),
        })
    redacted_run = {'status': run.get('status') if run.get('status') in ALLOWED_STATUS else 'unknown',
                    'attributes': _attributes(run.get('attributes'))}
    return {
        'schema': SCHEMA_VERSION,
        'trace_id': _trace_fingerprint(redacted_run, result),
        'provenance': {
            'kind': 'redacted_operational_trace',
            'correlation': 'redacted_trace_fingerprint',
            'source_identifier_stored': False,
        },
        'run': redacted_run,
        'spans': result,
        'privacy': {'content_stored': False, 'wall_clock_stored': False,
                    'external_export': False},
    }


def from_workflow_report(report: dict) -> dict:
    """Adapt the existing durable tool receipt; does not execute or inspect tools."""
    if not isinstance(report, dict):
        raise ValueError('rapport requis')
    # Durable launchers wrap the actual report in agent_report.  Accept that
    # envelope without reading its session id or transcript text.
    if isinstance(report.get('agent_report'), dict):
        report = report['agent_report']
    calls = report.get('tool_calls')
    if calls is None:
        calls = [
            {'tool': part.get('tool'), 'state': part.get('state', {})}
            for message in report.get('messages', []) if isinstance(message, dict)
            and message.get('info', {}).get('role') == 'assistant'
            for part in message.get('parts', []) if isinstance(part, dict) and part.get('type') == 'tool'
        ]
    if not isinstance(calls, list):
        raise ValueError('tool_calls invalides')
    spans = []
    cursor = 0
    for call in calls:
        if not isinstance(call, dict):
            continue
        state = call.get('state', {})
        status = state.get('status') if isinstance(state, dict) else None
        spans.append({'kind': 'tool', 'status': 'ok' if status == 'completed' else 'error',
                      'start_ms': cursor, 'duration_ms': 0,
                      'attributes': {'tool.name': str(call.get('tool', 'unknown'))[:96]}})
        cursor += 0.001
    return normalize({'run': {'id': 'workflow:' + str(report.get('run_id', 'receipt')),
                              'status': 'ok' if report.get('outcome') == 'completed' else 'unknown',
                              'attributes': {'source.kind': 'workflow-receipt'}}, 'spans': spans})


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description='Normalise une trace locale redigée, sans réseau ni modèle.')
    parser.add_argument('source', type=Path)
    parser.add_argument('--workflow-receipt', action='store_true')
    args = parser.parse_args(argv)
    data = json.loads(args.source.read_text())
    value = from_workflow_report(data) if args.workflow_receipt else normalize(data)
    print(json.dumps(value, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
