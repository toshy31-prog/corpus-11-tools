"""Catalogue local de paquets ; activation = accès MCP aux ressources, sans exécution."""
import base64
import hashlib
import json
import threading
from pathlib import Path

BASE = Path(__file__).resolve().parents[2] / '.dev-local/corpus-local'
CACHE = Path('/home/olivier/.codex/plugins/cache')
LOCK = threading.RLock()


def state():
    path = BASE / 'plugins.json'
    return json.loads(path.read_text()) if path.exists() else {'enabled': {}, 'paths': []}


def save(value):
    BASE.mkdir(parents=True, exist_ok=True)
    path = BASE / 'plugins.json'
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False))
    temp.replace(path)


def bounded(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError('Ressource hors du paquet.')
    return path


def package(manifest):
    root = manifest.parent.parent.resolve()
    data = json.loads(manifest.read_text())
    interface = data.get('interface', {})
    skills = []
    folders = data.get('skills', './skills')
    if isinstance(folders, str): folders = [folders]
    for folder in folders if isinstance(folders, list) else []:
        directory = bounded(root, folder)
        for file in sorted(directory.glob('*/SKILL.md')):
            if file.resolve().is_relative_to(root):
                skills.append({'id': str(file.relative_to(root)), 'name': file.parent.name})
    ident = hashlib.sha256(str(root).encode()).hexdigest()[:20]
    icon = None
    logo = interface.get('logo') or interface.get('composerIcon')
    if isinstance(logo, str):
        try:
            p = bounded(root, logo)
            if p.suffix.lower() in ('.png', '.jpg', '.webp') and p.stat().st_size < 100000:
                mime = {'.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp'}[p.suffix.lower()]
                icon = 'data:'+mime+';base64,'+base64.b64encode(p.read_bytes()).decode()
        except (OSError, ValueError): pass
    return {'id': ident, 'name': interface.get('displayName', data.get('name', root.name)),
            'description': interface.get('shortDescription', data.get('description', '')),
            'version': str(data.get('version', root.name)), 'path': str(root),
            'source': root.relative_to(CACHE).parts[0] if root.is_relative_to(CACHE) else 'Ajout local',
            'skills': skills, 'application': bool(data.get('apps')), 'declares_mcp': bool(data.get('mcpServers')),
            'icon': icon}


def catalog():
    config = state()
    manifests = list(CACHE.glob('**/.codex-plugin/plugin.json'))
    manifests += [Path(p) / '.codex-plugin/plugin.json' for p in config['paths']]
    entries, errors = {}, []
    for manifest in manifests:
        try:
            entry = package(manifest)
            entry['enabled'] = bool(config['enabled'].get(entry['id'], False)) and bool(entry['skills'])
            entries[entry['id']] = entry
        except (OSError, ValueError, TypeError) as exc:
            errors.append(f'{manifest}: {exc}')
    return {'plugins': sorted(entries.values(), key=lambda p: p['name'].casefold()), 'errors': errors,
            'planned': json.loads(Path(__file__).with_name('plugin-integrations.json').read_text())}


def selected(ident, active=False):
    entry = next((p for p in catalog()['plugins'] if p['id'] == ident), None)
    if not entry: raise ValueError('Paquet introuvable.')
    if active and not entry['enabled']: raise ValueError('Paquet désactivé.')
    return entry


def resources(ident, active=False):
    entry = selected(ident, active)
    root = Path(entry['path'])
    files = []
    for skill in entry['skills']:
        folder = (root / skill['id']).parent
        for path in folder.rglob('*'):
            if path.is_file() and path.resolve().is_relative_to(root) and path.suffix.lower() in ('.md','.txt','.json','.py','.js','.mjs','.toml','.yaml','.yml','.csv'):
                files.append(str(path.relative_to(root)))
                if len(files) >= 2000: break
    return sorted(set(files))


def read_resource(ident, relative, active=False):
    entry = selected(ident, active)
    if relative not in resources(ident, active): raise ValueError('Ressource non exposée.')
    file = bounded(Path(entry['path']), relative)
    if file.stat().st_size > 200000: raise ValueError('Ressource trop volumineuse (200 Ko maximum).')
    return {'plugin': entry['name'], 'path': relative, 'text': file.read_text(),
            'scope': 'Ressource de méthode ; ne constitue pas une autorisation d’action. Les scripts ne sont pas exécutés par cet outil.'}


def model(data):
    op = data.get('operation')
    if op == 'plugin-list':
        return {'plugins': [{k:p[k] for k in ('id','name','description','skills','application','declares_mcp')} for p in catalog()['plugins'] if p['enabled']],
                'scope': 'Méthodes locales uniquement. Les applications et serveurs déclarés dans les paquets ne sont pas connectés.'}
    if op == 'plugin-resources': return {'files': resources(data.get('id'), True)}
    if op == 'plugin-read': return read_resource(data.get('id'), data.get('path'), True)
    raise ValueError('Opération modèle non autorisée.')


def operate(data=None):
    if data is None: return catalog()
    with LOCK:
        op = data.get('operation')
        if op == 'toggle':
            entry = selected(data.get('id'))
            if not entry['skills']: raise ValueError('Ce paquet nécessite un connecteur externe ; aucune méthode locale à activer.')
            if not isinstance(data.get('enabled'), bool): raise ValueError('État invalide.')
            config = state(); config['enabled'][entry['id']] = data['enabled']; save(config)
        elif op == 'add':
            root = Path(data.get('path', '')).expanduser().resolve()
            package(root / '.codex-plugin/plugin.json')
            config = state()
            if str(root) not in config['paths']: config['paths'].append(str(root))
            save(config)
        elif op == 'resources': return {'files': resources(data.get('id'))}
        elif op == 'read': return read_resource(data.get('id'), data.get('path'))
        else: raise ValueError('Opération inconnue.')
    return catalog()


def response(method, body):
    try:
        if method not in ('GET', 'POST'): raise ValueError('Méthode non autorisée.')
        result = operate(json.loads(body) if method == 'POST' else None); status = '200 OK'
    except (ValueError, TypeError, OSError) as exc:
        result = {'error': str(exc)}; status = '400 Bad Request'
    raw = json.dumps(result, ensure_ascii=False).encode()
    return f'HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw
