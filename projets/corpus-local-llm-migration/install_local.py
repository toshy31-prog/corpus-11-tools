#!/usr/bin/env python3
"""Provisionnement versionné, reprenable ; aucun réglage global ni lancement."""
import hashlib
import json
import shutil
import subprocess
import tarfile
from pathlib import Path
from corpus_paths import LLM_MODELS_ROOT, LOCAL_RUNTIME_ROOT

ROOT = Path(__file__).resolve().parents[2]
DEST = LOCAL_RUNTIME_ROOT
ARTIFACTS = [
    ('llama-b10964.tar.gz', 'https://github.com/ggml-org/llama.cpp/releases/download/b10964/llama-b10964-bin-ubuntu-x64.tar.gz', '9abf88aea48a55d0f80edb1ee20220b186848cca0b4e919d71518cfd7ca67443', 'llama-b10964'),
    ('opencode-v1.18.32.tar.gz', 'https://github.com/anomalyco/opencode/releases/download/v1.18.32/opencode-linux-x64.tar.gz', '3046e0404fdc60fb80307e7a47824ba07477364178a4d09baa8548496dd6d43b', 'opencode-v1.18.32'),
    ('llama-source-b10964.tar.gz', 'https://github.com/ggml-org/llama.cpp/archive/refs/tags/b10964.tar.gz', None, None),
    ('opencode-source-v1.18.32.tar.gz', 'https://github.com/anomalyco/opencode/archive/refs/tags/v1.18.32.tar.gz', None, None),
]

HOT_MODELS = [
    ('Qwen3.6-35B-A3B-UD-Q4_K_M.gguf',
     'https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF/resolve/a483e9e6cbd595906af30beda3187c2663a1118c/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf',
     'ac0e2c1189e055faa36eff361580e79c5bd6f8e76bffb4ce547f167d53e31a61', 22134528992),
    ('mmproj-Qwen3.6-F16.gguf',
     'https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF/resolve/8ab61f3ab67ce00dabe2719bf2d250ec66bc9020/mmproj-F16.gguf',
     '8971ee4f331ff0a4c609374f32984b3d4e6dc086c0aa35f1d637fad1829e887f', 899283680),
]


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(8 * 1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def main():
    DEST.mkdir(parents=True, exist_ok=True, mode=0o700)
    downloads = DEST / 'downloads'
    downloads.mkdir(exist_ok=True)
    manifest_path = DEST / 'installation.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'artifacts': {}, 'runtime_verified': False}
    for name, url, expected, directory in ARTIFACTS:
        target = downloads / name
        print('Acquisition : ' + name, flush=True)
        if not target.exists():
            if name.endswith('.gguf') and shutil.disk_usage(DEST).free < 25 * 1024**3:
                raise RuntimeError('Marge disque insuffisante pour le modèle et le fonctionnement.')
            partial = target.with_name(target.name + '.part')
            subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error', '--retry', '3', '--connect-timeout', '30', '--continue-at', '-', '--output', str(partial), url], check=True)
            actual = digest(partial)
            if expected and actual != expected:
                raise RuntimeError('SHA-256 différent de la source publiée : ' + name)
            partial.rename(target)
        actual = digest(target)
        if expected and actual != expected:
            raise RuntimeError('SHA-256 local incorrect : ' + name)
        if directory:
            install = DEST / 'versions' / directory
            install.mkdir(parents=True, exist_ok=True)
            if not hasattr(tarfile, 'data_filter'):
                raise RuntimeError('Extraction sûre indisponible dans ce Python.')
            with tarfile.open(target) as archive:
                archive.extractall(install, filter='data')
        manifest['artifacts'][name] = {'url': url, 'sha256': actual, 'published_sha256_verified': bool(expected), 'bytes': target.stat().st_size, 'installed_directory': directory}
        tmp = manifest_path.with_suffix('.tmp')
        tmp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        tmp.replace(manifest_path)
        print('Vérifié : ' + name, flush=True)

    hot_root = LLM_MODELS_ROOT / 'qwen3.6'
    hot_root.mkdir(parents=True, exist_ok=True)
    for name, url, expected, expected_bytes in HOT_MODELS:
        target = hot_root / name
        print('Acquisition HOT : ' + name, flush=True)
        if not target.exists():
            if shutil.disk_usage(hot_root).free < 25 * 1024**3:
                raise RuntimeError('Marge disque insuffisante pour le modèle et le fonctionnement.')
            partial = target.with_name(target.name + '.part')
            subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error', '--retry', '3',
                            '--connect-timeout', '30', '--continue-at', '-', '--output', str(partial), url], check=True)
            if partial.stat().st_size != expected_bytes or digest(partial) != expected:
                raise RuntimeError('SHA-256 ou taille différente de la source publiée : ' + name)
            partial.rename(target)
        if target.stat().st_size != expected_bytes or digest(target) != expected:
            raise RuntimeError('Poids HOT local incorrect : ' + name)
        manifest['artifacts'][name] = {
            'url': url,
            'sha256': expected,
            'published_sha256_verified': True,
            'bytes': target.stat().st_size,
            'installed_directory': None,
            'canonical_path': str(target),
        }
        tmp = manifest_path.with_suffix('.tmp')
        tmp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        tmp.replace(manifest_path)
        print('Vérifié HOT : ' + name, flush=True)


if __name__ == '__main__':
    main()
