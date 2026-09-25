"""Préférences Git locales, sans opération distante."""
import json
import subprocess
import threading
from pathlib import Path
from corpus_paths import CONFIG_ROOT
BASE = CONFIG_ROOT / 'corpus-local'
LOCK = threading.RLock()
def settings(data=None):
    with LOCK:
        path = BASE / 'git-settings.json'
        value = json.loads(path.read_text()) if path.exists() else {'prefix':'codex/'}
        if data is not None:
            if not isinstance(data,dict) or not isinstance(data.get('prefix'),str):
                raise ValueError('Préfixe texte attendu.')
            prefix=data['prefix']
            if len(prefix)>120 or prefix.startswith('-') or any(c.isspace() for c in prefix):
                raise ValueError('Préfixe de branche invalide.')
            result=subprocess.run(['git','check-ref-format','--branch',prefix+'local-example'],capture_output=True,timeout=5)
            if result.returncode: raise ValueError('Préfixe de branche invalide.')
            value={'prefix':prefix}
            BASE.mkdir(parents=True,exist_ok=True)
            tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(value));tmp.replace(path)
        return value
def response(method,body):
    try:
        if method not in ('GET','POST'): raise ValueError('Méthode non autorisée.')
        value=settings(json.loads(body) if method=='POST' else None);status='200 OK'
    except (ValueError,OSError,subprocess.SubprocessError) as e:
        value={'error':str(e)};status='400 Bad Request'
    raw=json.dumps(value).encode()
    return f'HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw
