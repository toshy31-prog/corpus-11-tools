"""Gestion locale des copies Corpus ; aucun fetch ni suppression forcée."""
import json
import subprocess
import threading
import uuid
from pathlib import Path
from corpus_paths import CONFIG_ROOT, LOCAL_RUNTIME_ROOT

ROOT = Path(__file__).resolve().parents[2]
BASE = LOCAL_RUNTIME_ROOT
SETTINGS = CONFIG_ROOT / 'corpus-local/worktrees.json'
LOCK = threading.RLock()

def git(*args, repository=None):
    p = subprocess.run(['git', '-C', str(repository or ROOT), *args], capture_output=True, text=True, timeout=60)
    if p.returncode: raise ValueError(p.stderr.strip())
    return p.stdout

def state():
    return json.loads(SETTINGS.read_text()) if SETTINGS.exists() else {'root':str(BASE / 'worktrees'),'auto':False,'limit':15,'managed':[]}

def save(s):
    SETTINGS.parent.mkdir(parents=True, exist_ok=True)
    temp=SETTINGS.with_suffix('.tmp');temp.write_text(json.dumps(s));temp.replace(SETTINGS)

def listing(s):
    result=[]
    for block in '\n\n'.join(git('worktree','list','--porcelain',repository=r) for r in dict.fromkeys([str(ROOT),*s.get('repositories',{}).values()])).strip().split('\n\n'):
        fields=dict(line.partition(' ')[::2] for line in block.splitlines())
        path=fields.get('worktree','')
        result.append({'path':path,'branch':fields.get('branch','').removeprefix('refs/heads/'),'head':fields.get('HEAD',''),'exists':Path(path).is_dir(),'managed':path in s['managed'],'main':path==str(ROOT)})
    return result

def remove(s,path):
    if path not in s['managed']: raise ValueError('Seules les copies créées ici peuvent être supprimées. Les copies Codex sont conservées.')
    if not any(x['path']==path for x in listing(s)): raise ValueError('Copie non enregistrée dans Git.')
    # Inclut aussi les fichiers ignorés : aucun fichier personnel ne sera effacé.
    p=subprocess.run(['git','-C',path,'status','--porcelain','--untracked-files=all','--ignored'],capture_output=True,text=True,timeout=30,check=True)
    if p.stdout: raise ValueError('Cette copie contient des modifications ou des fichiers non suivis. Suppression refusée.')
    git('worktree','remove',path,repository=s.get('repositories',{}).get(path))
    s['managed'].remove(path);save(s)

def operate(data=None):
    with LOCK:
        s=state()
        if data is not None:
            if not isinstance(data,dict): raise ValueError('Objet JSON attendu.')
            action=data.get('action')
            if action=='settings':
                root=Path(data.get('root') or str(BASE/'worktrees')).resolve()
                if not root.is_relative_to(BASE.resolve()) or root==BASE.resolve(): raise ValueError('Choisir un sous-dossier de '+str(BASE)+' pour rester dans le périmètre local.')
                limit=int(data.get('limit',15))
                if not 1<=limit<=100: raise ValueError('La limite doit être comprise entre 1 et 100.')
                s.update(root=str(root),auto=data.get('auto') is True,limit=limit);save(s)
            elif action=='create':
                import environment_manager
                permanent=data.get('permanent') is True
                name=data.get('name','Projet')
                if permanent and (not isinstance(name,str) or not name.strip() or len(name)>80):
                    raise ValueError('Nom requis, limité à 80 caractères.')
                environment = environment_manager.profile(data['environment']) if data.get('environment') else None
                source_project=environment['project'] if environment else str(ROOT)
                if environment_manager.read().get('readonly',{}).get(source_project):
                    raise ValueError('Projet en lecture seule : création de worktree désactivée.')
                root=Path(s['root']);root.mkdir(parents=True,exist_ok=True)
                key=uuid.uuid4().hex[:12];path=str(root/key)
                import git_settings
                git('worktree','add','-b',git_settings.settings()['prefix']+'local-'+key,path,'HEAD',repository=environment_manager.repository(environment['project']) if environment else ROOT)
                s['managed'].append(path)
                if permanent:
                    s.setdefault('permanent', []).append(path)
                    s.setdefault('names', {})[path] = name.strip()
                s.setdefault('repositories',{})[path]=str(environment_manager.repository(environment['project']) if environment else ROOT)
                save(s)
                warnings=[]
                if permanent:
                    try:environment_manager.operate({'action':'add-project','path':path,'name':name.strip()})
                    except (ValueError,TypeError,OSError) as e:warnings.append('Copie créée, mais enregistrement du projet en échec : '+str(e))
                preparation=None
                if environment:
                    try: preparation=environment_manager.prepare(environment,path)
                    except (ValueError,OSError) as e: preparation={'ok':False,'output':str(e)}
                    if not preparation['ok']: warnings.append('Copie créée, mais préparation en échec : '+preparation['output'])
                import hooks_manager
                try:hooks_manager.created(path)
                except (ValueError,OSError) as e:warnings.append('Hook non préparé : '+str(e))
                if s['auto']:
                    for old in list(s['managed'])[:-s['limit']]:
                        if old in s.get('permanent', []): continue
                        try: remove(s,old)
                        except (ValueError,subprocess.SubprocessError) as e: warnings.append(str(e))
                return {'settings':s,'entries':listing(s),'created':path,'warnings':warnings,'preparation':preparation}
            elif action=='remove':
                if data.get('confirmed') is not True: raise ValueError('Confirmation requise.')
                remove(s,data.get('path'))
            else: raise ValueError('Action inconnue.')
        return {'settings':s,'entries':listing(s)}

def response(method,body):
    try:
        if method not in ('GET','POST'): raise ValueError('Méthode non autorisée.')
        result=operate(json.loads(body) if method=='POST' else None);status='200 OK'
    except (ValueError,TypeError,OSError,subprocess.SubprocessError) as e:
        result={'error':str(e)};status='400 Bad Request'
    raw=json.dumps(result).encode()
    return f'HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw
