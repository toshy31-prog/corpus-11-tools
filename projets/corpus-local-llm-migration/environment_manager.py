"""Profils de préparation locaux, appliqués seulement aux nouvelles copies."""
import json
import subprocess
import tempfile
import threading
import uuid
from pathlib import Path
from corpus_paths import LOCAL_RUNTIME_ROOT

ROOT = Path(__file__).resolve().parents[2]
BASE = LOCAL_RUNTIME_ROOT
LOCK = threading.RLock()

def read():
    file=BASE/'environments.json'
    return json.loads(file.read_text()) if file.exists() else {'projects':[str(ROOT)],'profiles':[]}

def save(value):
    BASE.mkdir(parents=True,exist_ok=True)
    p=BASE/'environments.json.tmp';p.write_text(json.dumps(value,ensure_ascii=False));p.replace(BASE/'environments.json')

def project_path(value):
    if not isinstance(value,str) or not value.strip():raise ValueError('Indiquer le dossier du projet.')
    path=Path(value).resolve()
    managed=False
    if path.is_relative_to(BASE.resolve()):
        import worktree_manager
        managed=str(path) in worktree_manager.state().get('managed',[])
    if (path.is_relative_to(BASE.resolve()) and not managed) or not path.is_dir():
        raise ValueError('Choisir un dossier existant, hors du stockage privé de Corpus.')
    return str(path)

def operate(data=None):
    with LOCK:
        state=read()
        if data is not None:
            if not isinstance(data,dict): raise ValueError('Objet JSON attendu.')
            if data.get('action')=='pick-project':
                result=subprocess.run(['zenity','--file-selection','--directory','--title=Choisir le dossier du projet'],capture_output=True,text=True,timeout=120)
                if result.returncode==1:return {'cancelled':True}
                if result.returncode:raise ValueError('Le sélecteur de dossiers ne peut pas être ouvert sur ce bureau.')
                return {'path':project_path(result.stdout.strip())}
            if data.get('action')=='add-project':
                path=project_path(data.get('path',''))
                name=data.get('name')
                if name is not None:
                    if not isinstance(name,str) or not name.strip() or len(name)>80: raise ValueError('Nom requis, limité à 80 caractères.')
                    state.setdefault('names',{})[path]=name.strip()
                if path not in state['projects']:state['projects'].append(path)
                state.setdefault('readonly',{})[path]=data.get('readonly') is True
            elif data.get('action')=='save':
                path=project_path(data.get('project',''))
                if state.get('readonly',{}).get(path):raise ValueError('Projet en lecture seule : préparation désactivée.')
                if path not in state['projects']:raise ValueError('Ajouter ce projet avant de configurer son environnement.')
                name=data.get('name','');script=data.get('script','')
                if not isinstance(name,str) or not name.strip() or len(name)>80 or not isinstance(script,str) or len(script)>6000:raise ValueError('Nom requis (80 caractères maximum), script limité à 6 000 caractères.')
                name=name.strip()
                ident=data.get('id') or uuid.uuid4().hex
                previous=next((x for x in state['profiles'] if x['id']==ident),None)
                if data.get('id') and previous is None:raise ValueError('Environnement introuvable.')
                state['profiles']=[x for x in state['profiles'] if x['id']!=ident]
                state['profiles'].append({'id':ident,'project':path,'name':name,'script':script})
            elif data.get('action')=='remove':
                if data.get('confirmed') is not True:raise ValueError('Confirmer le retrait du profil.')
                state['profiles']=[x for x in state['profiles'] if x['id']!=data.get('id')]
            else:raise ValueError('Action inconnue.')
            save(state)
        return state

def profile(ident):
    result=next((x for x in read()['profiles'] if x['id']==ident),None)
    if result is None:raise ValueError('Environnement introuvable.')
    project_path(result['project'])
    if read().get('readonly',{}).get(result['project']):raise ValueError('Projet en lecture seule : création de worktree désactivée.')
    return result

def repository(project):
    result=subprocess.run(['git','-C',project,'rev-parse','--show-toplevel'],capture_output=True,text=True,timeout=10)
    if result.returncode:raise ValueError('Ce projet ne possède pas de dépôt Git. Aucun worktree ne peut être créé.')
    return Path(result.stdout.strip()).resolve()

def prepare(record,worktree):
    worktree=Path(worktree).resolve()
    cwd=(worktree / Path(record['project']).relative_to(repository(record['project']))).resolve()
    if not cwd.is_relative_to(worktree) or not cwd.is_dir():raise ValueError('Le dossier du projet manque dans cette version Git.')
    if not record['script'].strip():return {'ok':True,'output':'Aucun script de préparation défini.'}
    command=['bwrap','--unshare-net','--unshare-pid','--die-with-parent','--ro-bind','/','/','--tmpfs','/home','--tmpfs','/run','--tmpfs','/tmp','--proc','/proc','--dev','/dev','--bind',str(worktree),str(worktree),'--chdir',str(cwd),'--clearenv','--setenv','PATH','/usr/local/bin:/usr/bin:/bin','--setenv','HOME','/tmp','--setenv','LANG','C.UTF-8','/bin/sh','-eu','-c',record['script']]
    with tempfile.TemporaryFile() as output:
        try:
            p=subprocess.run(command,stdout=output,stderr=subprocess.STDOUT,timeout=120)
            ok=p.returncode==0
        except subprocess.TimeoutExpired:
            ok=False
        output.seek(0,2);size=output.tell();output.seek(max(0,size-12000));text=output.read().decode(errors='replace')
    return {'ok':ok,'output':text or ('Préparation terminée.' if ok else 'Préparation interrompue ou en échec.')}

def response(method,body):
    try:
        if method not in ('GET','POST'):raise ValueError('Méthode non autorisée.')
        value=operate(json.loads(body) if method=='POST' else None);status='200 OK'
    except (ValueError,TypeError,OSError,subprocess.SubprocessError) as e:value={'error':str(e)};status='400 Bad Request'
    raw=json.dumps(value).encode()
    return f'HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw
