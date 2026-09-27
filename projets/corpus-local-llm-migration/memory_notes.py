"""Text note editing with optimistic concurrency and local revision history."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile
import time
import uuid

LIMIT = 65536


def locate(root, relative):
    root = Path(root).resolve(strict=True)
    part = Path(relative)
    if part.is_absolute() or not part.parts or any(x.startswith('.') for x in part.parts):
        raise ValueError('Choisir une note non cachée dans le projet.')
    path = root / part
    if path.resolve(strict=True) != path or not path.is_file() or path.suffix.lower() not in ('.md', '.txt'):
        raise ValueError('Note texte régulière requise, sans lien symbolique.')
    if path.stat().st_nlink != 1:
        raise ValueError('Les fichiers à liens multiples ne sont pas modifiables ici.')
    return path


def read(path):
    with path.open('rb') as stream:
        raw = stream.read(LIMIT + 1)
    if len(raw) > LIMIT:
        raise ValueError('Cette note dépasse 64 Kio ; utiliser l’éditeur de fichiers.')
    return {'text': raw.decode('utf-8'), 'sha256': hashlib.sha256(raw).hexdigest()}


def operate(data, root, state):
    path = locate(root, data['path'])
    action = data['action']
    key = hashlib.sha256(str(path).encode()).hexdigest()
    history = Path(state) / 'memory-history' / key
    if action == 'memory_read':
        return {**read(path), 'path': data['path']}
    if action == 'memory_history':
        rows = [json.loads(p.read_text()) for p in sorted(history.glob('*.json'), reverse=True)[:20]]
        return {'revisions': rows, 'path': data['path']}
    if action != 'memory_save':
        raise ValueError('Action mémoire inconnue.')
    text = data.get('text')
    if not isinstance(text, str) or len(text.encode('utf-8')) > LIMIT:
        raise ValueError('Note limitée à 64 Kio.')
    history.mkdir(parents=True, exist_ok=True)
    with (history / 'edit.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        path = locate(root, data['path'])
        before = read(path)
        if data.get('sha256') != before['sha256']:
            raise ValueError('La note a changé ailleurs. Votre texte est conservé ici ; consultez la version actuelle avant de réessayer.')
        if text == before['text']:
            return {**before, 'path': data['path'], 'changed': False}
        version = f'{time.time_ns()}-{uuid.uuid4().hex}'
        backup = history / (version + '.json')
        with backup.open('x', encoding='utf-8') as stream:
            json.dump({**before, 'path': str(path), 'saved_at': time.time(),
                       'reason': 'before_edit'}, stream, ensure_ascii=False)
            stream.flush()
            os.fsync(stream.fileno())
        fd, name = tempfile.mkstemp(prefix='.corpus-note-', dir=path.parent)
        try:
            with os.fdopen(fd, 'w', encoding='utf-8', newline='') as stream:
                os.fchmod(stream.fileno(), stat.S_IMODE(path.stat().st_mode))
                stream.write(text)
                stream.flush()
                os.fsync(stream.fileno())
            if read(locate(root, data['path']))['sha256'] != before['sha256']:
                raise ValueError('Modification concurrente détectée ; réouvrir la note.')
            os.replace(name, path)
        finally:
            Path(name).unlink(missing_ok=True)
        return {**read(path), 'path': data['path'], 'changed': True, 'previous_version': version}
