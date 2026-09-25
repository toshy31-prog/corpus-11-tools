#!/usr/bin/env python3
"""Bounded local delivery. No Git mutations, deletion plans, shell or network API.

The lock coordinates this helper only. Checks are trusted local commands chosen
by the agent; this tool is not a sandbox or a semantic approval authority.
"""
import argparse
import base64
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import stat
import subprocess
import tempfile
import uuid


class Blocked(ValueError):
    pass


FORBIDDEN = {'.git', '.codex', '.agents', '.maintenance', '.dev-local',
             '.runtime', 'backups', 'archives', 'completed', 'node_modules',
             '.venv', '.toolchains', 'habitat-autogere-pepiniere-solidaire',
             'corpus-ce-qui-reste-possible', 'corpus-ui-workspace'}
SELF_FILES = {'scripts/autonomy_integrate.py', 'scripts/test_autonomy_integrate.py'}


def local_path(root, name):
    if not isinstance(name, str) or not name or Path(name).is_absolute():
        raise Blocked('Relative file path required')
    parts = name.split('/')
    if any(p in ('', '.', '..') or p in FORBIDDEN for p in parts):
        raise Blocked('Protected or noncanonical path: ' + name)
    if name in SELF_FILES or any(p == 'AGENTS.md' or p.startswith('.env') for p in parts):
        raise Blocked('Authority, delivery tool or private configuration: ' + name)
    result = root
    for part in parts:
        result = result / part
        if result.is_symlink():
            raise Blocked('Symlink: ' + name)
    if result.exists() and not result.is_file():
        raise Blocked('Not a regular file: ' + name)
    return result


def snapshot(path):
    if path.is_symlink():
        raise Blocked('Symlink: ' + str(path))
    if not path.exists():
        return None
    if not path.is_file() or path.stat().st_size > 2 * 1024 * 1024:
        raise Blocked('Not a bounded regular file: ' + str(path))
    data = path.read_bytes()
    return {'sha256': hashlib.sha256(data).hexdigest(),
            'data': base64.b64encode(data).decode(),
            'mode': stat.S_IMODE(path.stat().st_mode)}


def content(value):
    data = base64.b64decode(value['data'], validate=True)
    if hashlib.sha256(data).hexdigest() != value['sha256'] or len(data) > 2 * 1024 * 1024:
        raise Blocked('Corrupt snapshot')
    if type(value['mode']) is not int or not 0 <= value['mode'] <= 0o777:
        raise Blocked('Invalid snapshot permissions')
    return data


def atomic(path, data, mode=0o600):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix='.delivery-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def save(path, value):
    atomic(path, (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode())


def storage(root):
    directory = root
    for part in ('.dev-local', 'autonomy', 'delivery'):
        directory = directory / part
        if directory.is_symlink():
            raise Blocked('Symlink in receipt storage')
        directory.mkdir(exist_ok=True)
    return directory


@contextmanager
def locked(root):
    directory = storage(root)
    fd = os.open(directory / 'lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise Blocked('Another delivery is active') from exc
        yield directory
    finally:
        os.close(fd)


def prepare(source, target, files, watches, checks, goal):
    source, target = Path(source).resolve(), Path(target).resolve()
    if source == target or not source.is_dir() or not target.is_dir():
        raise Blocked('Two distinct existing working directories required')
    if not goal.strip() or not files or len(files) > 50 or len(set(files)) != len(files):
        raise Blocked('A goal and 1–50 distinct files are required')
    if not checks or any(not isinstance(c, list) or not c or
                         any(not isinstance(a, str) or not a for a in c) for c in checks):
        raise Blocked('At least one explicit command argv is required')
    baseline = {}
    for name in sorted(set(files + watches)):
        left = snapshot(local_path(source, name))
        right = snapshot(local_path(target, name))
        if left != right:
            raise Blocked('Synchronize and review before editing: ' + name)
        if name in watches and name not in files and right is None:
            raise Blocked('Watched dependency is missing: ' + name)
        baseline[name] = right
    batch = {'schema_version': 1, 'id': uuid.uuid4().hex, 'goal': goal,
             'source': str(source), 'target': str(target), 'files': files,
             'baseline': baseline, 'checks': checks, 'status': 'prepared'}
    path = storage(source) / (batch['id'] + '.batch.json')
    save(path, batch)
    return path


def verify_baseline(batch, root, expected):
    for name, value in expected.items():
        if snapshot(local_path(root, name)) != value:
            raise Blocked('Changed file or dependency: ' + name)


def run_checks(checks, root, directory, phase):
    results = []
    for number, argv in enumerate(checks):
        log = directory / f'{phase}-{number}.log'
        with log.open('wb') as stream:
            try:
                process = subprocess.Popen(argv, cwd=root, stdout=stream,
                                           stderr=subprocess.STDOUT, start_new_session=True)
                try:
                    code = process.wait(timeout=180)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
                    raise
            except (OSError, subprocess.TimeoutExpired) as exc:
                stream.write(str(exc).encode())
                code = -1
        results.append({'argv': argv, 'returncode': code, 'log': str(log)})
        if code != 0:
            break
    return results


def restore(receipt, path):
    root = Path(receipt['target'])
    for name, after in receipt['after'].items():
        content(after)
        if receipt['baseline'][name] is not None:
            content(receipt['baseline'][name])
    conflicts = []
    for name, after in receipt['after'].items():
        before = receipt['baseline'][name]
        try:
            current = snapshot(local_path(root, name))
        except Blocked:
            conflicts.append(name)
            continue
        if current == before:
            continue
        if current != after:
            conflicts.append(name)
            continue
        destination = local_path(root, name)
        if before is None:
            destination.unlink()
        else:
            atomic(destination, content(before), before['mode'])
    receipt['status'] = 'rollback_blocked' if conflicts else 'rolled_back'
    receipt['conflicts'] = conflicts
    save(path, receipt)
    return receipt


def apply(batch_path):
    batch = json.loads(Path(batch_path).read_text())
    source, target = Path(batch['source']), Path(batch['target'])
    if batch.get('schema_version') != 1 or source == target:
        raise Blocked('Invalid batch')
    if not isinstance(batch['id'], str) or len(batch['id']) != 32 or any(
            c not in '0123456789abcdef' for c in batch['id']):
        raise Blocked('Invalid batch id')
    for value in batch['baseline'].values():
        if value is not None:
            content(value)
    with locked(target) as directory:
        receipt_path = directory / (batch['id'] + '.receipt.json')
        if receipt_path.exists():
            raise Blocked('Batch already attempted; inspect its receipt')
        # An interrupted previous transfer must be resolved before a new one.
        for previous in directory.glob('*.receipt.json'):
            if json.loads(previous.read_text())['status'] in ('applying', 'rollback_blocked'):
                raise Blocked('Unresolved delivery: ' + str(previous))
        verify_baseline(batch, target, batch['baseline'])
        watched = {p: b for p, b in batch['baseline'].items() if p not in batch['files']}
        verify_baseline(batch, source, watched)
        after = {p: snapshot(local_path(source, p)) for p in batch['files']}
        if any(value is None for value in after.values()):
            raise Blocked('Deletion is not an autonomous delivery operation')
        after = {p: value for p, value in after.items() if value != batch['baseline'][p]}
        if not after:
            raise Blocked('No change to deliver')
        if any(v['mode'] & 0o7000 or (batch['baseline'][p] is not None and
               v['mode'] != batch['baseline'][p]['mode']) for p, v in after.items()):
            raise Blocked('Permission changes require separate review')
        logs = directory / (batch['id'] + '.logs')
        logs.mkdir()
        receipt = {**batch, 'after': after, 'status': 'checking_candidate'}
        receipt['candidate_checks'] = run_checks(batch['checks'], source, logs, 'candidate')
        if any(r['returncode'] for r in receipt['candidate_checks']):
            receipt['status'] = 'candidate_failed'
            save(receipt_path, receipt)
            return receipt_path, receipt
        verify_baseline(batch, source, {**batch['baseline'], **after})
        verify_baseline(batch, target, batch['baseline'])
        receipt['status'] = 'applying'
        save(receipt_path, receipt)  # Recovery data precedes every target write.
        try:
            for name, value in after.items():
                destination = local_path(target, name)
                if snapshot(destination) != batch['baseline'][name]:
                    raise Blocked('Concurrent target edit: ' + name)
                atomic(destination, content(value), value['mode'])
            receipt['target_checks'] = run_checks(batch['checks'], target, logs, 'target')
            if any(r['returncode'] for r in receipt['target_checks']):
                raise Blocked('Target validation failed')
            verify_baseline(batch, target, {**batch['baseline'], **after})
            receipt['status'] = 'integrated'
            save(receipt_path, receipt)
        except Exception as exc:
            receipt['failure'] = str(exc)
            restore(receipt, receipt_path)
        return receipt_path, receipt


def recover(path):
    path = Path(path).resolve()
    receipt = json.loads(path.read_text())
    with locked(Path(receipt['target'])) as directory:
        if path.parent != directory:
            raise Blocked('Receipt must belong to the target delivery directory')
        if receipt['status'] not in ('applying', 'rollback_blocked', 'integrated'):
            raise Blocked('Nothing to restore')
        return restore(receipt, path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    create = sub.add_parser('prepare')
    create.add_argument('--source', required=True)
    create.add_argument('--target', required=True)
    create.add_argument('--file', action='append', required=True)
    create.add_argument('--watch', action='append', default=[])
    create.add_argument('--check', action='append', type=json.loads, required=True,
                        help='JSON argv of a reviewed local validation command')
    create.add_argument('--goal', required=True)
    sub.add_parser('apply').add_argument('batch')
    sub.add_parser('recover').add_argument('receipt')
    args = parser.parse_args()
    try:
        if args.command == 'prepare':
            result = {'batch': str(prepare(args.source, args.target, args.file,
                                          args.watch, args.check, args.goal))}
        elif args.command == 'apply':
            path, receipt = apply(args.batch)
            result = {'receipt': str(path), 'status': receipt['status'],
                      'conflicts': receipt.get('conflicts', [])}
        else:
            receipt = recover(args.receipt)
            result = {'status': receipt['status'], 'conflicts': receipt.get('conflicts', [])}
        print(json.dumps(result, ensure_ascii=False))
        expected = {'prepare': 'prepared', 'apply': 'integrated', 'recover': 'rolled_back'}
        return 0 if result.get('status', 'prepared') == expected[args.command] else 1
    except (Blocked, OSError, KeyError, ValueError) as exc:
        print(json.dumps({'status': 'blocked', 'reason': str(exc)}, ensure_ascii=False))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
