"""Persistent, opt-in update discovery. Never changes running models or system packages."""
import json
import re
import threading
import time
import subprocess
import urllib.request
import urllib.parse
from pathlib import Path
from corpus_paths import LOCAL_RUNTIME_ROOT, MEDIA_MODELS_ROOT, MODELS_ROOT, RUNTIME_ROOT, STATE_ROOT

PROJECT = Path(__file__).resolve().parent
ROOT = PROJECT.parents[1]
STATE = STATE_ROOT / 'updates/state.json'
LOCK = threading.RLock()
STARTED = False
BUSY = False
SYSTEM_STATUS = Path('/var/lib/dpkg/status')
NVIDIA_VERSION = Path('/proc/driver/nvidia/version')
SYSTEM_BIN = Path('/usr/bin')

def local_json(path, default):
    try:
        if path.stat().st_size > 4 * 1024 * 1024: return default
        return json.loads(path.read_text())
    except (OSError, ValueError): return default

def model_row(item, path, kind):
    row = {**item, 'kind': kind, 'path': str(path), 'installed': path.is_file()}
    if row['installed']:
        info = path.stat()
        # A cheap identity for retaining earlier checks; never hash multi-GB weights on GET.
        row['localFingerprint'] = f'{info.st_dev}:{info.st_ino}:{info.st_size}:{info.st_mtime_ns}'
        row['localSize'] = info.st_size
    row['verifiable'] = all(row.get(key) for key in ('repository', 'source_file', 'sha256')) and not row.get('source_url')
    row['status'] = ('Absent localement' if not row['installed'] else 'Non vérifié' if row['verifiable']
                     else 'Non vérifiable : source ou empreinte de référence inconnue')
    if row.get('sha256'):
        row['hashBasis'] = 'Empreinte du manifeste local ; fichier non recalculé pendant cet inventaire.'
    return row

def huggingface_source(url):
    parsed = urllib.parse.urlparse(url if isinstance(url, str) else '')
    pieces = urllib.parse.unquote(parsed.path).strip('/').split('/')
    if parsed.scheme == 'https' and parsed.netloc == 'huggingface.co' and len(pieces) >= 5 and pieces[2] == 'resolve':
        return {'repository': '/'.join(pieces[:2]), 'revision': pieces[3], 'source_file': '/'.join(pieces[4:])}
    return {}

def read():
    try: return json.loads(STATE.read_text())
    except (OSError, ValueError): return {'automatic': False, 'checked': None, 'models': [], 'components': []}

def save(value):
    STATE.parent.mkdir(parents=True, exist_ok=True)
    temp = STATE.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2))
    temp.replace(STATE)

def inventory():
    rows = []
    for name in ('MEDIA_MODELS_LOCK.json', 'AUDIO_MODELS_LOCK.json'):
        for item in json.loads((PROJECT / name).read_text()):
            path = MEDIA_MODELS_ROOT / item['file']
            rows.append(model_row(item, path, 'audio' if name.startswith('AUDIO') else 'media'))
    core_lock = PROJECT / 'CORE_MODELS_LOCK.json'
    if core_lock.is_file():
        entries = local_json(core_lock, [])
        for item in entries if isinstance(entries, list) else []:
            if not isinstance(item, dict) or item.get('tier') != 'hot':
                continue
            relative = item.get('relative')
            if not isinstance(relative, str):
                continue
            path = MODELS_ROOT / relative
            rows.append(model_row(dict(item), path, item.get('kind', 'model')))
    else:
        # Compatibility only for isolated pre-contract fixtures.
        base = LOCAL_RUNTIME_ROOT
        manifest = local_json(base / 'installation.json', {})
        artifacts = manifest.get('artifacts', {}) if isinstance(manifest, dict) else {}
        if not isinstance(artifacts, dict): artifacts = {}
        for path in sorted((base / 'downloads').glob('*.gguf')):
            receipt = artifacts.get(path.name, {})
            if not isinstance(receipt, dict): receipt = {}
            source = huggingface_source(receipt.get('url'))
            row = {'file': path.name, **source}
            if receipt.get('sha256'): row['sha256'] = receipt['sha256']
            if receipt.get('bytes'): row['size'] = receipt['bytes']
            rows.append(model_row(row, path, 'vision' if path.name.startswith('mmproj') else 'llm'))
        for directory in sorted(base.glob('voice-model*')):
            path = directory / 'model.bin'
            if not path.is_file(): continue
            row = {'file': f'{directory.name}/model.bin'}
            metadata_path = directory / '.cache/huggingface/download/model.bin.metadata'
            try:
                if metadata_path.stat().st_size < 4096:
                    lines = metadata_path.read_text().splitlines()
                    if lines and re.fullmatch(r'[0-9a-f]{40}', lines[0]): row['revision'] = lines[0]
                    if len(lines) > 1 and re.fullmatch(r'[0-9a-f]{64}', lines[1]): row['sha256'] = lines[1]
            except OSError: pass
            rows.append(model_row(row, path, 'asr'))
    return rows

def installed_packages():
    """Read package metadata, without running APT or a runtime during page loading."""
    try: text = SYSTEM_STATUS.read_text()
    except OSError: return []
    rows = []
    for paragraph in text.split('\n\n'):
        fields = dict(line.split(': ', 1) for line in paragraph.splitlines() if ': ' in line and not line.startswith(' '))
        name = fields.get('Package', '')
        relevant = (name in ('ffmpeg', 'pandoc', 'espeak-ng', 'libc6', 'libstdc++6') or
                    any(token in name for token in ('nvidia', 'mesa', 'vulkan', 'python3')) or
                    name.startswith(('libreoffice', 'intel-media-va-driver')))
        if relevant and fields.get('Status') == 'install ok installed':
            version = fields.get('Version')
            rows.append({'id': 'package:' + name, 'name': name, 'installed': True, 'version': version,
                         'versionBasis': 'Base locale des paquets installés',
                         'status': f'Installé · {version or "version inconnue"} · mises à jour non vérifiées'})
    return rows

def component_inventory():
    base = RUNTIME_ROOT
    rows = installed_packages()
    paths = [
        ('llama.cpp (CPU)', 'corpus-local/versions/llama-b10964/llama-b10964/llama-server'),
        ('llama.cpp (Vulkan)', 'corpus-local/versions/llama-b10964-vulkan/llama-b10964/llama-server'),
        ('llama.cpp (compilation locale)', 'corpus-local/build/llama-cpu/bin/llama-server'),
        ('OpenCode', 'corpus-local/versions/opencode-v1.18.32/opencode'),
        ('stable-diffusion.cpp', 'corpus-media/runtime/sd-cli'),
        ('audio.cpp', 'corpus-media/audio-runtime/audiocpp_cli'),
        ('LibreOffice (Corpus)', 'corpus-office/root/libreoffice/program/soffice.bin'),
        ('Transcription locale (Python)', 'corpus-local/voice-env/bin/python'),
    ]
    for name, relative in paths:
        path = base / relative
        installed = path.is_file()
        rows.append({'id': 'runtime:' + relative, 'name': name, 'path': str(path), 'installed': installed,
                     'version': None, 'status': 'Présent · version et mise à jour non vérifiables sans provenance binaire' if installed else 'Absent localement'})
    for name in ('ffmpeg', 'pandoc', 'libreoffice', 'espeak-ng'):
        # Keep the executable visible even when installed outside the package database.
        if any(row['name'] == name for row in rows): continue
        path = SYSTEM_BIN / name
        rows.append({'id': 'tool:' + name, 'name': name, 'path': str(path), 'installed': path.is_file(), 'version': None,
                     'status': 'Présent · version et mise à jour non vérifiées' if path.is_file() else 'Absent localement'})
    try:
        version = re.search(r'Kernel Module[^\n]*?\s(\d+\.\d+(?:\.\d+)?)\s', NVIDIA_VERSION.read_text())
        if version:
            rows.append({'id': 'driver:nvidia-loaded', 'name': 'Pilote NVIDIA chargé', 'installed': True, 'version': version.group(1),
                         'versionBasis': str(NVIDIA_VERSION), 'status': f'Chargé · {version.group(1)} · mises à jour non vérifiées'})
    except OSError: pass
    return rows

def merge_checks(current, previous, models=False):
    """Refresh presence without discarding checks of the same local installation."""
    def key(row): return row.get('path') if models else row.get('id', row.get('name'))
    previous = {key(row): row for row in previous if isinstance(row, dict)}
    for row in current:
        old = previous.get(key(row), {})
        if models:
            same = (row.get('localFingerprint') == old.get('localFingerprint') and
                    all(row.get(field) == old.get(field) for field in ('installed', 'sha256', 'repository', 'source_file')))
        else:
            same = all(row.get(field) == old.get(field) for field in ('installed', 'version', 'path'))
        if same and row.get('installed'):
            for field in ('status', 'remoteRevision', 'remoteSha256', 'checkedAt', 'cachedUpgrade'):
                if field in old: row[field] = old[field]
    return current

def metadata(repository):
    url = 'https://huggingface.co/api/models/' + urllib.parse.quote(repository, safe='/') + '?blobs=true'
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Corpus-local-update-check'}), timeout=25) as response:
        raw = response.read(8 * 1024 * 1024 + 1)
        if len(raw) > 8 * 1024 * 1024: raise ValueError('Métadonnées trop volumineuses')
        return json.loads(raw)

def scan():
    global BUSY
    try:
        models = inventory(); cache = {}
        for item in models:
            if not item['installed']:
                item['status'] = 'Absent localement'; continue
            if item.get('source_url'):
                item['status'] = 'Source spécifique : vérification manuelle requise'; continue
            if not all(item.get(key) for key in ('repository', 'source_file', 'sha256')):
                item['status'] = 'Non vérifiable : source ou empreinte de référence inconnue'; continue
            try:
                repo = item['repository']
                if repo not in cache: cache[repo] = metadata(repo)
                remote = cache[repo]
                entry = next((f for f in remote.get('siblings', []) if f.get('rfilename') == item['source_file']), None)
                digest = (entry or {}).get('lfs', {}).get('sha256')
                item['remoteRevision'] = remote.get('sha')
                item['remoteSha256'] = digest
                item['status'] = 'Contenu inchangé · aucun téléchargement' if digest == item['sha256'] else 'Nouvelle version à qualifier' if digest else 'Empreinte distante indisponible'
            except Exception as error: item['status'] = 'Échec de vérification : ' + str(error)[:180]
        components = component_inventory()
        result = subprocess.run(['apt', 'list', '--upgradable'], capture_output=True, text=True, timeout=30, env={'PATH':'/usr/bin:/bin','LC_ALL':'C'})
        for line in result.stdout.splitlines()[1:]:
            if any(x in line.lower() for x in ('nvidia','mesa','vulkan','ffmpeg','libreoffice','pandoc','libstdc++','libc6','python3')):
                name = line.split('/')[0]
                row = next((row for row in components if row.get('id') == 'package:' + name), None)
                if row is None:
                    row = {'id': 'package:' + name, 'name': name}
                    components.append(row)
                row.update(status=line + ' · selon le cache APT local', cachedUpgrade=line)
        components.append({'name':'Cache système APT', 'status':'Lecture du cache local uniquement ; aucune actualisation ni installation système.'})
        with LOCK:
            state = read(); state.update(models=models, components=components, checked=time.time(), error=None); save(state)
    except Exception as error:
        with LOCK:
            state=read(); state.update(error=str(error)[:300], checked=time.time()); save(state)
    finally:
        with LOCK: BUSY = False

def launch():
    global BUSY
    with LOCK:
        if BUSY: return
        BUSY = True
        threading.Thread(target=scan, daemon=True, name='corpus-update-scan').start()

def start():
    global STARTED
    with LOCK:
        if STARTED: return
        STARTED = True
    def loop():
        while True:
            state=read()
            if state.get('automatic') and time.time()-(state.get('checked') or 0)>86400: launch()
            time.sleep(60)
    threading.Thread(target=loop, daemon=True, name='corpus-update-watch').start()

def response(method, body):
    start()
    try:
        if method == 'POST':
            data=json.loads(body)
            if not isinstance(data,dict):raise ValueError('Objet JSON attendu.')
            if data.get('action') == 'check': launch()
            elif data.get('action') == 'configure':
                if type(data.get('automatic')) is not bool: raise ValueError('Valeur automatique invalide')
                with LOCK:
                    state=read(); state['automatic']=data['automatic']; save(state)
            else: raise ValueError('Action inconnue')
        elif method != 'GET': raise ValueError('Méthode non autorisée')
        state=read(); state['busy']=BUSY
        state['models'] = merge_checks(inventory(), state.get('models', []), models=True)
        previous = state.get('components', [])
        state['components'] = merge_checks(component_inventory(), previous)
        state['components'].extend(row for row in previous if row.get('name') == 'Cache système APT')
        code='200 OK'
    except (ValueError, TypeError, OSError) as error: state={'error':str(error)}; code='400 Bad Request'
    raw=json.dumps(state).encode()
    return f'HTTP/1.1 {code}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw
