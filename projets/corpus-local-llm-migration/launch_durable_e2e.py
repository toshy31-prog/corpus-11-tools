"""Detach one prebuilt local e2e exercise from the initiating client.

This command only starts the recorder.  The recorder itself makes the single
model request; its atomic result file is the status channel.
"""
import argparse
import json
import subprocess
import sys
import uuid
from pathlib import Path

import durable_e2e


def command(args, unit):
    runner = Path(__file__).with_name('durable_e2e.py')
    return [
        'systemd-run', '--user', '--collect', '--quiet', '--unit=' + unit,
        sys.executable, str(runner), '--message', str(args.message), '--result', str(args.result),
        '--directory', str(args.directory), '--title', args.title, '--deadline', str(args.deadline),
        '--poll-delay', str(args.poll_delay), '--base-url', args.base_url,
    ]


def main(argv=None, *, run=subprocess.run):
    parser = argparse.ArgumentParser(description='Détache une épreuve Corpus bornée dans le gestionnaire local.')
    parser.add_argument('--message', required=True, type=Path)
    parser.add_argument('--result', required=True, type=Path)
    parser.add_argument('--directory', default=Path(__file__).resolve().parents[2], type=Path)
    parser.add_argument('--title', default='Épreuve Corpus bornée')
    parser.add_argument('--deadline', type=int, default=600, choices=range(1, 3601), metavar='SECONDES')
    parser.add_argument('--poll-delay', type=int, default=3, choices=range(1, 61), metavar='SECONDES')
    parser.add_argument('--base-url', default='http://127.0.0.1:18743')
    args = parser.parse_args(argv)
    # systemd-run does not promise the caller's working directory.  Persist
    # only absolute paths so the detached runner addresses the same fixture.
    args.message = args.message.resolve()
    args.result = args.result.resolve()
    args.directory = args.directory.resolve()
    durable_e2e.parse_message(args.message)
    durable_e2e.local_request(args.base_url)
    if not args.directory.is_dir():
        raise ValueError('Projet Corpus absent.')
    if args.result.exists():
        raise ValueError('Le reçu existe déjà : choisir un nouveau chemin.')
    unit = 'corpus-bounded-e2e-' + uuid.uuid4().hex[:12]
    run(command(args, unit), check=True)
    print(json.dumps({'unit': unit, 'result': str(args.result), 'state': 'launched'}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
