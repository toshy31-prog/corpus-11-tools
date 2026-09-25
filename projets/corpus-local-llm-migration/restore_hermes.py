#!/usr/bin/env python3
"""Restaure les dépendances verrouillées de Hermes depuis le cache local."""
import argparse
import os
from pathlib import Path
import subprocess
from corpus_paths import CACHE_ROOT, LOCAL_RUNTIME_ROOT, TOOLCHAIN_SOURCES_ROOT, UV_CACHE_ROOT, contract_environment

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--verify-copy', action='store_true', help='Restaurer dans un environnement de vérification distinct')
args = parser.parse_args()
base = LOCAL_RUNTIME_ROOT
UV_CACHE_ROOT.mkdir(parents=True, exist_ok=True)
env = {**os.environ, 'UV_PYTHON_DOWNLOADS': 'never', 'UV_CACHE_DIR': str(UV_CACHE_ROOT),
       'UV_PROJECT_ENVIRONMENT': str(base / ('hermes-restore-check' if args.verify_copy else 'hermes-env'))}
env.update(contract_environment())
subprocess.run(['bwrap', '--unshare-net', '--ro-bind', '/', '/', '--bind', str(base), str(base),
                '--bind', str(CACHE_ROOT), str(CACHE_ROOT),
                '--dev', '/dev', '--proc', '/proc', str(base / 'build-env/bin/uv'),
                'sync', '--offline', '--python', '/usr/bin/python3', '--project',
                str(TOOLCHAIN_SOURCES_ROOT / 'hermes-agent-2026.9.21'), '--frozen', '--no-dev',
                '--no-default-groups'], env=env, check=True)
