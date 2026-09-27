"""Automatic, non-destructive filing of allowlisted local diagnostic evidence."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import stat
import threading
import time

from corpus_paths import CONFIG_ROOT, STATE_ROOT, LOCAL_RUNTIME_ROOT
CONFIG = CONFIG_ROOT / 'organizer.json'
BASE = STATE_ROOT / 'organizer'
RULES = {
    'legacy-captures': (LOCAL_RUNTIME_ROOT / 'logs', 'Anciennes captures de diagnostic',
                        ('opencode-tools-capture.jsonl','payload-capture-raw.json','payload-capture-meta.json')),
    'payload-captures': (STATE_ROOT / 'logs/corpus-local/payload-capture', 'Captures des prochains diagnostics',
                         ('payload-capture-raw.json','payload-capture-meta.json')),
}
DEFAULT = {'enabled': True, 'interval_minutes': 60, 'quota_mib': 64,
           'rules': {key: True for key in RULES}}
MAX_FILE = 5 * 1024 * 1024
QUIET_SECONDS = 300


def read_json(path, default):
    try: return json.loads(path.read_text())
    except FileNotFoundError: return default


def validate(value):
    if not isinstance(value,dict) or set(value) != set(DEFAULT): raise ValueError('Réglages incomplets ou inconnus.')
    if type(value['enabled']) is not bool: raise ValueError('Activation invalide.')
    for key, low, high in [('interval_minutes',5,1440),('quota_mib',1,1024)]:
        if type(value[key]) is not int or not low <= value[key] <= high: raise ValueError('Fréquence ou quota hors limites.')
    if not isinstance(value['rules'],dict) or set(value['rules']) != set(RULES) or any(type(v) is not bool for v in value['rules'].values()): raise ValueError('Règles invalides.')
    return value


def settings():
    return validate(read_json(CONFIG, json.loads(json.dumps(DEFAULT))))


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.new')
    with temp.open('w') as f:
        json.dump(value,f,ensure_ascii=False,indent=2); f.write('\n'); f.flush(); os.fsync(f.fileno())
    os.replace(temp,path)


@contextmanager
def locked():
    BASE.mkdir(parents=True, exist_ok=True)
    with (BASE / 'lock').open('a') as f:
        fcntl.flock(f,fcntl.LOCK_EX)
        yield


def scan(config):
    rows = []
    for rule, (root, label, names) in RULES.items():
        for name in names:
            path = root / name
            if not path.exists() and not path.is_symlink(): continue
            entry = {'rule':rule,'name':name,'source':str(path),'status':'ready','bytes':0}
            try:
                # Refuse aliases: these rules concern only their declared physical files.
                if path.is_symlink() or root.resolve() != root: raise ValueError('Lien symbolique exclu')
                fd = os.open(path,os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
                with os.fdopen(fd,'rb') as f:
                    before = os.fstat(f.fileno())
                    entry['bytes'] = before.st_size
                    if not stat.S_ISREG(before.st_mode): raise ValueError('Fichier ordinaire requis')
                    if before.st_size > MAX_FILE: raise ValueError('Plus de 5 Mio : examen manuel')
                    if time.time() - before.st_mtime < QUIET_SECONDS: raise ValueError('Écriture récente : attendre 5 minutes')
                    data = f.read(MAX_FILE+1); after = os.fstat(f.fileno())
                    if (before.st_size,before.st_mtime_ns,before.st_ino) != (after.st_size,after.st_mtime_ns,after.st_ino) or len(data)!=before.st_size: raise ValueError('Fichier en cours de modification')
                digest = hashlib.sha256(data).hexdigest()
                day = datetime.fromtimestamp(before.st_mtime,timezone.utc).strftime('%Y-%m-%d')
                relative = Path('archive') / rule / day / (digest + '-' + name)
                previous = sorted((BASE/'archive'/rule).glob('*/'+digest+'-'+name))
                if previous: relative = previous[0].relative_to(BASE)
                entry.update(sha256=digest,destination=str(BASE/relative),relative=str(relative),_data=data)
                if not config['rules'][rule]: entry['status']='disabled'
                elif (BASE/relative).exists():
                    if (BASE/relative).is_symlink() or hashlib.sha256((BASE/relative).read_bytes()).hexdigest()!=digest: raise ValueError('Archive existante incohérente')
                    entry['status']='already_filed'
            except (OSError,ValueError) as error:
                entry.update(status='skipped',reason=str(error))
            rows.append(entry)
    return rows


def usage():
    archive=BASE/'archive'
    return sum(p.stat().st_size for p in archive.rglob('*') if p.is_file() and not p.is_symlink()) if archive.exists() else 0


def public(rows):
    return [{k:v for k,v in row.items() if k!='_data'} for row in rows]


def status():
    config=settings()
    return {'settings':config,'rules':[{'id':key,'label':value[1],'source':str(value[0])} for key,value in RULES.items()],
            'destination':str(BASE/'archive'),'used_bytes':usage(),
            'history':read_json(BASE/'history.json',[])[:30], 'last_error':read_json(BASE/'error.json',None),
            'policy':'Copies classées et vérifiées ; originaux conservés. Aucune suppression automatique.'}


def run(automatic=False):
    with locked():
        config=settings()
        if automatic and not config['enabled']: return {'state':'paused'}
        history=read_json(BASE/'history.json',[])
        if automatic and history and time.time()-history[0]['timestamp'] < config['interval_minutes']*60: return {'state':'not_due'}
        rows=scan(config); used=usage(); copied=0
        for row in rows:
            if row['status']!='ready': continue
            if used+row['bytes'] > config['quota_mib']*1024*1024:
                row.update(status='quota',reason='Quota atteint ; aucun fichier supprimé.');continue
            destination=Path(row['destination'])
            if destination.parent.resolve() != destination.parent:
                row.update(status='error',reason='Destination symbolique exclue');continue
            destination.parent.mkdir(parents=True,exist_ok=True)
            temp=destination.with_name(destination.name+'.part')
            try:
                with temp.open('xb') as f:
                    f.write(row['_data']);f.flush();os.fsync(f.fileno())
                if hashlib.sha256(temp.read_bytes()).hexdigest()!=row['sha256']: raise OSError('Copie non conforme')
                # Atomic no-clobber publication; originals are never touched.
                os.link(temp,destination)
                row['status']='filed';used+=row['bytes'];copied+=1
            except OSError as error: row.update(status='error',reason=str(error))
            finally:
                if temp.exists(): temp.unlink()
        receipt={'timestamp':time.time(),'automatic':automatic,'copied':copied,'rows':public(rows)}
        write_json(BASE/'history.json',[receipt]+history[:99])
        return receipt


def operate(data):
    if not isinstance(data,dict): raise ValueError('Objet attendu.')
    action=data.get('action','status')
    if action=='settings':
        value=validate(data.get('settings'))
        with locked(): write_json(CONFIG,value)
    elif action=='preview': return {'rows':public(scan(settings())),'used_bytes':usage()}
    elif action=='run': return run()
    elif action!='status': raise ValueError('Action inconnue.')
    return status()


def response(method,body):
    try:
        value=operate(json.loads(body) if method=='POST' else {});code='200 OK'
    except (ValueError,TypeError,OSError) as error: value={'error':str(error)};code='400 Bad Request'
    raw=json.dumps(value,ensure_ascii=False).encode()
    return f'HTTP/1.1 {code}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw


def start():
    def worker():
        while True:
            try: run(automatic=True)
            except Exception as error:
                # Surface failures; never silently turn a failed run into success.
                try:
                    with locked(): write_json(BASE/'error.json',{'timestamp':time.time(),'error':str(error)})
                except OSError: pass
            time.sleep(60)
    threading.Thread(target=worker,name='corpus-organizer',daemon=True).start()


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('action',choices=['status','preview','run','settings'],nargs='?',default='status')
    p.add_argument('--settings-file',type=Path)
    args=p.parse_args();data={'action':args.action}
    if args.action=='settings':
        if not args.settings_file: p.error('--settings-file requis')
        data['settings']=json.loads(args.settings_file.read_text())
    print(json.dumps(operate(data),ensure_ascii=False,indent=2))

if __name__=='__main__': main()
