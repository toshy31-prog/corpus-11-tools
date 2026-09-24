"""Mesures locales en lecture seule ; aucune facture ni estimation de coût."""
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
import local_statistics
from runtime_limits import CONTEXT_TOKENS, OUTPUT_TOKENS

BASE = Path(__file__).resolve().parents[2] / '.dev-local/corpus-local'

def memory(path=Path('/proc/meminfo')):
    values = {}
    for line in path.read_text().splitlines():
        key, _, raw = line.partition(':')
        if key in ('MemTotal', 'MemAvailable'):
            values[key] = int(raw.split()[0]) * 1024
    total, available = values['MemTotal'], values['MemAvailable']
    if not 0 <= available <= total or total <= 0:
        raise ValueError('Mesure mémoire incohérente')
    return {'total': total, 'available': available}

def snapshot(base=BASE, meminfo=Path('/proc/meminfo'), aggregate=local_statistics.aggregate):
    result = {'updated_at': datetime.now(timezone.utc).isoformat(),
              'limits': {'context': CONTEXT_TOKENS, 'output': OUTPUT_TOKENS},
              'memory': None, 'disk': None, 'activity': None, 'errors': {}}
    try:
        result['memory'] = memory(meminfo)
    except (OSError, ValueError, KeyError, IndexError):
        result['errors']['memory'] = 'Mémoire système indisponible.'
    try:
        disk = shutil.disk_usage(base)
        result['disk'] = {'total': disk.total, 'available': disk.free}
    except OSError:
        result['errors']['disk'] = 'Volume de stockage local indisponible.'
    try:
        stats = aggregate(7)
        result['activity'] = {
            'tokens': sum(sum(v) for v in stats['metrics']['tokens'].values()),
            'turns': sum(sum(v) for v in stats['metrics']['turns'].values()),
            'tokens_missing': stats['counters']['tokens_missing'],
            'sessions': stats['sessions']}
    except (OSError, ValueError, KeyError, TypeError, AttributeError, OverflowError, local_statistics.sqlite3.Error):
        result['errors']['activity'] = 'Historique local indisponible.'
    return result

def response(method, body):
    value = snapshot() if method == 'GET' else {'error': 'Lecture seule.'}
    status = '200 OK' if method == 'GET' else '405 Method Not Allowed'
    raw = json.dumps(value, ensure_ascii=False).encode()
    return f'HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode() + raw
