#!/usr/bin/env python3
"""Reconstruit le moteur CPU depuis les sources présentes, sans réseau."""
import os
from pathlib import Path
import subprocess
from corpus_paths import BUILD_CACHE_ROOT, LOCAL_RUNTIME_ROOT, TOOLCHAIN_SOURCES_ROOT

ROOT = Path(__file__).resolve().parents[2]
BASE = LOCAL_RUNTIME_ROOT
SOURCE = TOOLCHAIN_SOURCES_ROOT / 'llama.cpp-b10964'
BUILD = BUILD_CACHE_ROOT / 'corpus-local/llama-cpu'
CMAKE = BASE / 'build-env/bin/cmake'
env = dict(os.environ)
# L'archive n'a pas de .git : ne pas lui attribuer le commit du dépôt Corpus.
env['GIT_CEILING_DIRECTORIES'] = str(TOOLCHAIN_SOURCES_ROOT)
BUILD.parent.mkdir(parents=True, exist_ok=True)
prefix = ['bwrap', '--unshare-net', '--ro-bind', '/', '/', '--bind', str(BASE),
          str(BASE), '--bind', str(BUILD_CACHE_ROOT), str(BUILD_CACHE_ROOT),
          '--tmpfs', '/tmp', '--dev', '/dev', '--proc', '/proc', str(CMAKE)]
subprocess.run(prefix + ['-S', str(SOURCE), '-B', str(BUILD),
    '-DCMAKE_BUILD_TYPE=Release', '-DCMAKE_BUILD_RPATH_USE_ORIGIN=ON',
    '-DCMAKE_INSTALL_RPATH=$ORIGIN', '-DCMAKE_SKIP_RPATH=NO',
    '-DLLAMA_OPENSSL=OFF', '-DLLAMA_BUILD_TESTS=OFF',
    '-DLLAMA_BUILD_EXAMPLES=OFF', '-DLLAMA_BUILD_TOOLS=ON', '-DGGML_NATIVE=ON'],
    env=env, check=True)
subprocess.run(prefix + ['--build', str(BUILD), '--target', 'llama-server', '-j', '2'],
               env=env, check=True)
subprocess.run([str(BUILD / 'bin/llama-server'), '--version'], check=True)
