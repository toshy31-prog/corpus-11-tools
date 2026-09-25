"""Explicit local installation. Pinned weights/runtime, resumable downloads, hash check."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import shutil
import tarfile
import time
import urllib.request
from corpus_paths import MEDIA_RUNTIME_ROOT

BASE = MEDIA_RUNTIME_ROOT
RUNTIME_URL = 'https://github.com/0xShug0/audio.cpp/releases/download/v0.8.1/audio-v0.8.1-bin-ubuntu-x64-vulkan-portable.tar.gz'
RUNTIME_SHA256 = '63f778ef4c863ece0bca85b97c78e9629bd561724b1aa5330a9d47806608bbfa'


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(8 * 1024 * 1024):
            h.update(chunk)
    return h.hexdigest()


def download(entry):
    dest = BASE / 'models' / entry['file']
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_suffix('.partial')
    if dest.exists():
        if dest.stat().st_size == entry['size'] and digest(dest) == entry['sha256']:
            print('VERIFIED', dest.name, flush=True)
            return
        raise ValueError('Installed file does not match lock: ' + str(dest))
    url = f"https://huggingface.co/{entry['repository']}/resolve/{entry['revision']}/{entry['source_file']}"
    for attempt in range(8):
        offset = part.stat().st_size if part.exists() else 0
        if offset == entry['size']:
            break
        print('DOWNLOAD', dest.name, offset, '/', entry['size'], flush=True)
        try:
            request = urllib.request.Request(url + '?download=true&attempt=' + str(time.time_ns()),
                                             headers={'Range': f'bytes={offset}-'} if offset else {})
            with urllib.request.urlopen(request, timeout=90) as response:
                append = offset and response.status == 206
                if append and not response.headers.get('Content-Range', '').startswith(f'bytes {offset}-'):
                    raise ValueError('Unexpected resumed range')
                with part.open('ab' if append else 'wb') as out:
                    while chunk := response.read(4 * 1024 * 1024):
                        out.write(chunk)
        except (OSError, ValueError) as exc:
            print('RETRY', dest.name, str(exc), flush=True)
    if not part.exists() or part.stat().st_size != entry['size'] or digest(part) != entry['sha256']:
        raise ValueError('Incomplete or corrupt model: ' + str(part))
    part.replace(dest)
    print('VERIFIED', dest.name, flush=True)


def main():
    entries = json.loads(Path(__file__).with_name('AUDIO_MODELS_LOCK.json').read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(download, entries))
    archive = BASE / 'audio-runtime.tar.gz'
    if not archive.exists():
        urllib.request.urlretrieve(RUNTIME_URL, archive)
    if digest(archive) != RUNTIME_SHA256:
        raise ValueError('Runtime checksum mismatch')
    runtime = BASE / 'audio-runtime'
    runtime.mkdir(exist_ok=True)
    with tarfile.open(archive) as stream:
        stream.extractall(runtime, filter='data')
    (runtime / 'audiocpp_cli').chmod(0o755)
    (BASE / 'audio-manifest.json').write_text(json.dumps(entries, indent=2) + '\n')
    shutil.copytree(Path(__file__).with_name('media_licenses'), BASE / 'licenses', dirs_exist_ok=True)


if __name__ == '__main__':
    main()
