#!/usr/bin/env python3
"""Provisionnement versionné, reprenable ; aucun réglage global ni lancement."""
import hashlib
import json
import shutil
import subprocess
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / '.dev-local/corpus-local'
ARTIFACTS = [
    ('llama-b10964.tar.gz', 'https://github.com/ggml-org/llama.cpp/releases/download/b10964/llama-b10964-bin-ubuntu-x64.tar.gz', '9abf88aea48a55d0f80edb1ee20220b186848cca0b4e919d71518cfd7ca67443', 'llama-b10964'),
    ('opencode-v1.18.32.tar.gz', 'https://github.com/anomalyco/opencode/releases/download/v1.18.32/opencode-linux-x64.tar.gz', '3046e0404fdc60fb80307e7a47824ba07477364178a4d09baa8548496dd6d43b', 'opencode-v1.18.32'),
    ('llama-source-b10964.tar.gz', 'https://github.com/ggml-org/llama.cpp/archive/refs/tags/b10964.tar.gz', None, None),
    ('opencode-source-v1.18.32.tar.gz', 'https://github.com/anomalyco/opencode/archive/refs/tags/v1.18.32.tar.gz', None, None),
    ('Qwen3.8-27B-UD-Q5_K_M.gguf', 'https://huggingface.co/unsloth/Qwen3.8-27B-GGUF/resolve/4ca720788d1e01f1bff70c033e0d0028fd02e502/Qwen3.8-27B-UD-Q5_K_M.gguf', '2de73110cb254cbf09b54b717578dadff12ef1194e7271527e68202f39ba4bfd', None),
    ('Qwen3.6-35B-A3B-UD-Q4_K_M.gguf', 'https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF/resolve/a483e9e6cbd595906af30beda3187c2663a1118c/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf', 'ac0e2c1189e055faa36eff361580e79c5bd6f8e76bffb4ce547f167d53e31a61', None),
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


if __name__ == '__main__':
    main()
