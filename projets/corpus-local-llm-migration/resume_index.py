"""Search checkpoint metadata without reading memory files or invoking a model.

JSON snapshots stay authoritative. A bounded process cache avoids decoding unchanged
packets; directory/stat work remains O(n). No database migration is introduced.
"""
import json
import math
import threading
import unicodedata
from collections import OrderedDict
from pathlib import Path

_CACHE = OrderedDict()
_LOCK = threading.Lock()
_MAX_CACHE = 1024
_MAX_PACKET = 2 * 1024 * 1024


def _fold(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', value.casefold())
                   if not unicodedata.combining(c))


def _integer(data, name, default, minimum, maximum):
    value = data.get(name, default)
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        raise ValueError(f'{name}: entier attendu entre {minimum} et {maximum}')
    return value


def _metadata(path):
    stat = path.stat()
    if stat.st_size > _MAX_PACKET:
        raise ValueError('Point de reprise trop volumineux')
    key = (str(path.absolute()), stat.st_mtime_ns, stat.st_ctime_ns, stat.st_size, stat.st_ino)
    with _LOCK:
        if key in _CACHE:
            _CACHE.move_to_end(key)
            return dict(_CACHE[key])
    item = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(item, dict) or not isinstance(item.get('checkpoint'), dict):
        raise ValueError('Point de reprise invalide')
    checkpoint = item['checkpoint']
    row = {'id': path.stem, 'project': item['project'], 'objective': checkpoint['objective'],
           'next_step': checkpoint.get('next_step', ''), 'created_at': item['created_at']}
    if any(not isinstance(row[k], str) for k in ('project', 'objective', 'next_step')):
        raise ValueError('Métadonnées invalides')
    if isinstance(row['created_at'], bool) or not isinstance(row['created_at'], (int, float)) or not math.isfinite(row['created_at']):
        raise ValueError('Date invalide')
    with _LOCK:
        _CACHE[key] = dict(row)
        while len(_CACHE) > _MAX_CACHE:
            _CACHE.popitem(last=False)
    return row


def list_records(base, data=None):
    """Return records,total,offset,limit,has_more,skipped for portal list requests.

    Options: query (max 300 chars), sort=recent|oldest|title, offset>=0,
    limit=1..100 (default 25). All query words must occur in searchable metadata.
    Invalid snapshots are counted, not allowed to break the whole listing.
    """
    data = {} if data is None else data
    query = data.get('query', '')
    sort = data.get('sort', 'recent')
    if not isinstance(query, str) or len(query) > 300:
        raise ValueError('Recherche limitée à 300 caractères')
    if sort not in ('recent', 'oldest', 'title'):
        raise ValueError('Tri inconnu')
    offset = _integer(data, 'offset', 0, 0, 1000000)
    limit = _integer(data, 'limit', 25, 1, 100)
    base = Path(base)
    if base.is_symlink():
        raise ValueError('Dossier de stockage invalide')
    terms = _fold(query).split()
    rows, skipped = [], 0
    for path in base.glob('*.json'):
        if path.is_symlink() or len(path.stem) != 32 or any(c not in '0123456789abcdef' for c in path.stem):
            skipped += 1
            continue
        try:
            row = _metadata(path)
        except (OSError, ValueError, KeyError, TypeError, UnicodeError):
            skipped += 1
            continue
        haystack = _fold(' '.join(row[k] for k in ('project', 'objective', 'next_step')))
        if all(term in haystack for term in terms):
            rows.append(row)
    if sort == 'title':
        rows.sort(key=lambda r: (_fold(r['objective']), r['id']))
    else:
        rows.sort(key=lambda r: (r['created_at'], r['id']), reverse=sort == 'recent')
    return {'records': rows[offset:offset + limit], 'total': len(rows),
            'offset': offset, 'limit': limit, 'has_more': offset + limit < len(rows),
            'skipped': skipped}
