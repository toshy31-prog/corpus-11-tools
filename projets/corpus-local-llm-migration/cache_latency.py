"""Read-only comparison of recorded assistant durations by declared cache reads.

This module never reads message text into its result.  It describes an existing
local history; different tasks and prompt sizes remain confounders, so it does
not attribute a duration difference to the cache.
"""
from __future__ import annotations

import json
import sqlite3
from statistics import median


def _number(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _group(values):
    durations = sorted(values)
    return {
        'steps': len(durations),
        'median_duration_seconds': round(median(durations) / 1000, 3) if durations else None,
    }


def summarize(db, start, end):
    """Summarize assistant message durations in one observed time window."""
    groups = {'with_reported_cache_read': [], 'without_reported_cache_read': []}
    try:
        with sqlite3.connect(f'file:{db}?mode=ro', uri=True, timeout=3) as connection:
            rows = connection.execute(
                'select time_created,data from message where time_created>=? and time_created<=?',
                (start, end),
            ).fetchall()
        for created, raw in rows:
            data = json.loads(raw)
            if data.get('role') != 'assistant':
                continue
            completed = _number((data.get('time') or {}).get('completed'))
            if completed is None or completed < created:
                continue
            cache = (data.get('tokens') or {}).get('cache')
            read = _number(cache.get('read')) if isinstance(cache, dict) else None
            groups['with_reported_cache_read' if read and read > 0 else 'without_reported_cache_read'].append(completed - created)
        return {
            'available': True,
            'groups': {name: _group(values) for name, values in groups.items()},
            'scope': 'observed_assistant_message_durations_grouped_by_provider_reported_cache_read',
            'limits': [
                'Les demandes, longueurs de contexte, sorties et outils diffèrent entre groupes.',
                'Cette comparaison descriptive ne démontre pas que le cache cause une durée donnée.',
            ],
        }
    except (OSError, sqlite3.Error, json.JSONDecodeError, TypeError, ValueError):
        return {'available': False}
