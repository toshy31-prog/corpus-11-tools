"""Bounded desktop launch and read-only repository summary for the chat header."""
import json
import base64
import mimetypes
import hashlib
from urllib.parse import urlsplit, urlunsplit
import shutil
import subprocess
from pathlib import Path
import environment_manager
import worktree_manager


def project(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError('Dossier du projet requis.')
    path = Path(value).resolve()
    allowed = {Path(p).resolve() for p in environment_manager.read()['projects']}
    allowed.update(Path(p).resolve() for p in worktree_manager.state()['managed'])
    if path not in allowed or not path.is_dir():
        raise ValueError('Projet non enregistré.')
    return str(path)


def operate(data):
    if not isinstance(data, dict):
        raise ValueError('Objet JSON attendu.')
    path = project(data.get('project', str(environment_manager.ROOT)))
    action = data.get('action', 'summary')
    if action == 'open':
        target = data.get('target')
        commands = {'files': ['xdg-open', path], 'terminal': ['x-terminal-emulator', '--working-directory', path], 'kitty': ['kitty', '--directory', path]}
        if target not in commands:
            raise ValueError('Application non autorisée.')
        cmd = commands[target]
        if not shutil.which(cmd[0]):
            raise ValueError('Cette application n’est pas installée.')
        subprocess.Popen(cmd, cwd=path, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        return {'message': 'Ouverture demandée au bureau.'}
    if action == 'file':
        value=data.get('path','')
        if not isinstance(value,str) or not value: raise ValueError('Chemin requis.')
        file=(Path(path)/value).resolve()
        if not file.is_relative_to(Path(path)) or any(part in ('.git','.dev-local','.ssh','.gnupg') for part in file.relative_to(path).parts): raise ValueError('Fichier hors du projet consultable.')
        if not file.is_file() or file.stat().st_size>5*1024*1024: raise ValueError('Fichier absent ou supérieur à 5 Mo.')
        raw=file.read_bytes();mime=mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
        return {'filename':file.name,'mime':mime,'url':'data:'+mime+';base64,'+base64.b64encode(raw).decode()}
    if action in ('review', 'diff'):
        def read_git(*args):
            result = subprocess.run(['git', '-C', path, *args], capture_output=True, text=True, errors='replace', timeout=20)
            if result.returncode: raise ValueError('Révision Git indisponible.')
            return result.stdout
        mode = data.get('mode', 'working')
        refs = read_git('for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes').splitlines()
        base = data.get('base', 'HEAD')
        if base != 'HEAD' and base not in refs: raise ValueError('Référence inconnue.')
        modes = {'working': ['HEAD'], 'unstaged': [], 'staged': ['--cached'], 'branch': [base], 'committed': ['HEAD~1', 'HEAD']}
        if mode not in modes: raise ValueError('Comparaison inconnue.')
        args = modes[mode]
        files = read_git('diff', *args, '--name-only', '-z').split('\0')[:-1]
        if action == 'diff':
            name = data.get('file')
            if name not in files: raise ValueError('Fichier absent des modifications suivies.')
            options = ['--ignore-all-space'] if data.get('ignoreWhitespace') is True else []
            diff = read_git('diff', '--no-ext-diff', '--no-textconv', '--no-renames', *options, *args, '--', name)
            return {'file': name, 'diff': diff[:250000], 'truncated': len(diff) > 250000}
        untracked = read_git('ls-files', '--others', '--exclude-standard', '-z').split('\0')[:-1]
        return {'files': files, 'untracked': len(untracked), 'refs': refs, 'branch': read_git('branch', '--show-current').strip()}
    if action in ('branches','switch','create-branch','stage','commit','push'):
        if action != 'branches' and environment_manager.read().get('readonly', {}).get(path):
            raise ValueError('Projet en lecture seule : modification Git désactivée.')
        def run(*args):
            r=subprocess.run(['git','-C',path,*args],capture_output=True,text=True,timeout=45)
            if r.returncode: raise ValueError(r.stderr.strip()[:1000] or 'Opération Git refusée.')
            return r.stdout
        if action=='branches':
            remotes=run('remote').splitlines()
            remote=run('remote','get-url','origin').strip() if 'origin' in remotes else ''
            shown=remote
            if '://' in remote:
                parsed=urlsplit(remote);shown=urlunsplit((parsed.scheme,parsed.hostname or '',parsed.path,'',''))
            return {'branches':run('for-each-ref','--format=%(refname:short)','refs/heads').splitlines(),'staged':run('diff','--cached','--stat'),'unstaged':run('diff','--stat'),'files':run('ls-files','--modified','--others','--exclude-standard','-z').split('\0')[:-1],'remote':shown,'remoteFingerprint':hashlib.sha256(remote.encode()).hexdigest(),'head':run('rev-parse','HEAD').strip()}

        if data.get('confirmed') is not True: raise ValueError('Confirmation explicite requise.')
        if action in ('switch', 'create-branch'):
            name=data.get('branch','')
            if not isinstance(name,str) or not name or name.startswith('-'): raise ValueError('Branche invalide.')
            run('check-ref-format','--branch',name)
            if run('status','--porcelain').strip(): raise ValueError('Valider ou ranger les changements avant de changer de branche.')
            run('switch', '-c', name) if action == 'create-branch' else run('switch',name)
        elif action=='stage':
            files=data.get('files')
            if not isinstance(files,list) or not 0<len(files)<=100: raise ValueError('Sélectionner 1 à 100 fichiers.')
            for name in files:
                if not isinstance(name,str) or Path(name).is_absolute() or not (Path(path)/name).resolve().is_relative_to(Path(path)) or '.git' in Path(name).parts: raise ValueError('Chemin invalide.')
            run('--literal-pathspecs','add','--',*files)
        elif action=='commit':
            message=data.get('message','')
            if not isinstance(message,str) or not message.strip() or len(message)>4000: raise ValueError('Message de validation requis.')
            if not run('diff','--cached','--name-only').strip(): raise ValueError('Aucun fichier indexé. Indexer explicitement les fichiers souhaités dans le terminal.')
            run('commit','-m',message)
        else:
            remote=run('remote','get-url','origin').strip()
            if hashlib.sha256(remote.encode()).hexdigest()!=data.get('remoteFingerprint') or run('rev-parse','HEAD').strip()!=data.get('head'): raise ValueError('Destination ou commit modifié : rouvrir la prévisualisation.')
            if not run('branch','--show-current').strip(): raise ValueError('Branche détachée.')
            run('push','origin','HEAD')
        return {'message':'Opération Git terminée.'}
    if action != 'summary':
        raise ValueError('Action inconnue.')
    def git(*args):
        r = subprocess.run(['git', '-C', path, *args], capture_output=True, text=True, timeout=15)
        if r.returncode:
            raise ValueError('Informations Git indisponibles pour ce projet.')
        return r.stdout
    branch = git('branch', '--show-current').strip() or 'HEAD détachée'
    diff = git('diff', 'HEAD', '--numstat')
    added = removed = 0
    for line in diff.splitlines():
        parts = line.split('\t')
        if len(parts) >= 3 and parts[0].isdigit() and parts[1].isdigit():
            added += int(parts[0]); removed += int(parts[1])
    return {'project': path, 'branch': branch, 'added': added, 'removed': removed,
            'changes': git('status', '--short')[:16000],
            'applications': {k: bool(shutil.which(v)) for k, v in [('files', 'xdg-open'), ('terminal', 'x-terminal-emulator'), ('kitty', 'kitty')]}}


def response(method, body):
    try:
        if method != 'POST': raise ValueError('POST requis.')
        data = json.loads(body)
        if not isinstance(data, dict): raise ValueError('Objet JSON attendu.')
        value, status = operate(data), '200 OK'
    except (ValueError, OSError, TypeError, subprocess.SubprocessError) as e:
        value, status = {'error': str(e)}, '400 Bad Request'
    raw = json.dumps(value).encode()
    return f'HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode() + raw
