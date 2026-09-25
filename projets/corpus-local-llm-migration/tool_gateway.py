"""Demandes du modèle -> approbation humaine -> navigateur séparé."""
import json,os,socketserver,subprocess,threading,uuid,time,re
from pathlib import Path
from corpus_paths import LOCAL_RUNTIME_ROOT
HERE=Path(__file__).resolve().parent
BASE=LOCAL_RUNTIME_ROOT
LOCK=threading.RLock();WORKER_LOCK=threading.Lock();REQUESTS={};WORKER=None
ACTIONS={'tab-new','tab-select','tab-close','forward','launch','navigate','snapshot','screenshot','click','fill','back','reload','clear','close','download','ssh','git','hook'}

def browser_info():
    binary=BASE/'browsers/chromium-local/chrome-linux64/chrome'
    return {'name':'Chromium','installed':binary.is_file() and os.access(binary,os.X_OK),
            'driver':(BASE/'build-env/bin/python').is_file(),
            'display_available':bool(os.environ.get('DISPLAY') or os.environ.get('WAYLAND_DISPLAY')),
            'running':False,'visible':False,'profile':'Session temporaire dédiée à Corpus'}

def preferences():
    file=BASE/'browser-settings.json'
    return json.loads(file.read_text()) if file.exists() else {'enabled':True}

def submit(data):
    if not isinstance(data,dict) or data.get('action') not in ACTIONS:raise ValueError('Action navigateur invalide.')
    if 'visible' in data and not isinstance(data['visible'],bool):raise ValueError('Mode fenêtre invalide.')
    for key in ('url','selector','text'):
        if key in data and (not isinstance(data[key],str) or len(data[key])>8000):raise ValueError('Argument invalide.')
    with LOCK:
        if not preferences()['enabled'] and data['action'] not in ('clear','close','ssh','git','hook'):raise ValueError('Navigateur désactivé dans les paramètres.')
        if len(REQUESTS)>=100:
            for ident in list(REQUESTS):
                if REQUESTS[ident]['status'] not in ('pending','running'):del REQUESTS[ident]
            if len(REQUESTS)>=100:raise ValueError('Trop de demandes en attente.')
        ident=uuid.uuid4().hex
        REQUESTS[ident]={'id':ident,'arguments':data,'status':'pending','created':time.time()}
        return {'id':ident,'status':'pending','message':'Attente de validation dans Paramètres > Navigateur.'}

def execute(data):
    global WORKER
    if data['action']=='hook':
        import environment_manager,worktree_manager
        path=data.get('worktree')
        if path not in worktree_manager.state()['managed']:raise ValueError('Copie de travail non gérée par Corpus.')
        result=environment_manager.prepare({'project':str(environment_manager.repository(path)),'script':data.get('script','')},path)
        if not result['ok']:raise ValueError(result['output'])
        return {'title':'Hook · '+data.get('name',''),'text':result['output']}
    if data['action']=='git':
        import environment_manager
        project=str(Path(data.get('project',str(HERE.parents[1]))).resolve())
        state=environment_manager.read()
        if project not in state['projects']:raise ValueError('Ajouter le projet dans Environnements avant cette opération.')
        root=environment_manager.repository(project);task=data.get('task')
        if state.get('readonly',{}).get(project) and task not in ('status','diff'):raise ValueError('Projet en lecture seule.')
        if task=='status':command=['git','-C',str(root),'status','--short']
        elif task=='diff':command=['git','-C',str(root),'diff','--no-ext-diff','--no-textconv','HEAD','--']
        elif task=='push':command=['git','-C',str(root),'-c','core.hooksPath=/dev/null','push']
        elif task=='pr-create':
            title=data.get('title','');body=data.get('body','')
            if not title or not isinstance(body,str):raise ValueError('Titre et description requis.')
            command=['gh','pr','create','--draft','--title',title,'--body',body]
        elif task=='pr-merge':
            number=str(data.get('number',''))
            if not number.isdigit():raise ValueError('Numéro de pull request requis.')
            command=['gh','pr','merge',number,'--squash' if data.get('squash') is True else '--merge']
        else:raise ValueError('Opération Git inconnue.')
        result=subprocess.run(command,cwd=root,capture_output=True,text=True,timeout=60,env={**os.environ,'GH_PROMPT_DISABLED':'1','GIT_TERMINAL_PROMPT':'0','GIT_SSH_COMMAND':'ssh -o BatchMode=yes -o StrictHostKeyChecking=yes'})
        if result.returncode:raise ValueError(result.stderr[-12000:] or 'Opération Git échouée.')
        return {'title':'Git · '+task,'text':(result.stdout+result.stderr)[-18000:] or 'Opération terminée.'}
    if data['action']=='ssh':
        host=data.get('host','');user=data.get('user','');port=int(data.get('port',22));command=data.get('command','pwd')
        if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9.:-]{0,252}',host) or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_-]{0,63}',user) or not 1<=port<=65535 or not isinstance(command,str) or len(command)>4000:
            raise ValueError('Adresse, utilisateur, port ou commande SSH invalide.')
        result=subprocess.run(['ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=10','-p',str(port),'--',user+'@'+host,command],capture_output=True,text=True,timeout=30)
        if result.returncode:raise ValueError(result.stderr[-12000:] or 'Connexion SSH échouée.')
        return {'title':'SSH · '+host,'text':result.stdout[-18000:]}
    with WORKER_LOCK:
        if WORKER is None or WORKER.poll() is not None:
            WORKER=subprocess.Popen([str(BASE/'build-env/bin/python'),str(HERE/'browser_worker.py')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=(BASE/'logs/browser.log').open('a'),text=True)
        WORKER.stdin.write(json.dumps(data)+'\n');WORKER.stdin.flush()
        import selectors
        with selectors.DefaultSelector() as selector:
            selector.register(WORKER.stdout,selectors.EVENT_READ)
            if not selector.select(40):
                WORKER.kill();WORKER.wait();WORKER=None
                raise ValueError('Navigateur interrompu après 40 secondes.')
        raw=WORKER.stdout.readline()
        if not raw:raise ValueError('Navigateur arrêté ; consulter le journal local.')
        result=json.loads(raw)
        if 'error' in result:raise ValueError(result['error'])
        return result['result']

def operate(data=None):
    if data is None:
        with LOCK:return {'requests':list(REQUESTS.values()),'settings':preferences()}
    if not isinstance(data,dict):raise ValueError('Objet JSON attendu.')
    action=data.get('operation')
    if action=='browser-frame':
        if WORKER is None or WORKER.poll() is not None:return {'running':False}
        return execute({'action':'frame'})
    if action=='browser-user':
        arguments=data.get('arguments',{})
        if not isinstance(arguments,dict) or arguments.get('action') not in {'launch','navigate','back','forward','reload','close','pointer','type','key','scroll','allow-origin','tab-new','tab-select','tab-close','find','zoom','device','pdf','history','downloads'}:
            raise ValueError('Commande utilisateur invalide.')
        if not preferences()['enabled'] and arguments['action']!='close':raise ValueError('Navigateur désactivé dans les paramètres.')
        return execute(arguments)
    if action=='browser-status':
        info=browser_info()
        if WORKER is not None and WORKER.poll() is None:info.update(execute({'action':'status'}))
        return info
    if action in ('hooks','hook-save','hook-remove'):
        import hooks_manager
        return hooks_manager.operate(None if action=='hooks' else data)
    if action=='settings':
        if not isinstance(data.get('enabled'),bool):raise ValueError('État invalide.')
        with LOCK:
            path=BASE/'browser-settings.json';temp=path.with_suffix('.tmp');temp.write_text(json.dumps({'enabled':data['enabled']}));temp.replace(path)
            if not data['enabled']:
                for request in REQUESTS.values():
                    if request['status']=='pending':request['status']='rejected'
        if not data['enabled']:execute({'action':'close'})
        return {'settings':preferences()}
    if action=='request':return submit(data.get('arguments'))
    if action not in ('approve','reject'):raise ValueError('Opération inconnue.')
    with LOCK:
        request=REQUESTS.get(data.get('id'))
        if request is None or request['status']!='pending':raise ValueError('Demande absente ou déjà traitée.')
        request['status']='running' if action=='approve' else 'rejected'
    if action=='approve':
        try:
            request['result']=execute(request['arguments']);request['status']='done'
            if request['arguments']['action']=='clear':
                with LOCK:
                    REQUESTS.clear();REQUESTS[request['id']]=request
        except Exception as exc:request['error']=str(exc);request['status']='failed'
    return request

def response(method,body):
    try:
        if method not in ('GET','POST'):raise ValueError('Méthode non autorisée.')
        data=json.loads(body) if method=='POST' else None
        if method=='POST' and not isinstance(data,dict):raise ValueError('Objet JSON attendu.')
        result=operate(data);status='200 OK'
    except (ValueError,TypeError,OSError) as exc:result={'error':str(exc)};status='400 Bad Request'
    raw=json.dumps(result).encode()
    return f'HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw

class Handler(socketserver.StreamRequestHandler):
    def handle(self):
        try:
            raw=self.rfile.readline(256001)
            if len(raw)>256000 or not raw.endswith(b'\n'):raise ValueError('Requête d’outil trop volumineuse.')
            data=json.loads(raw)
            if not isinstance(data,dict):raise ValueError('Objet JSON attendu.')
            op=data.get('operation')
            # Le modèle ne peut pas approuver sa propre demande.
            if op=='request':result=submit(data.get('arguments'))
            elif op in ('plugin-list','plugin-resources','plugin-read'):
                import plugin_manager
                result=plugin_manager.model(data)
            elif op == 'document':
                import document_generation
                result=document_generation.operate(data.get('arguments',{}))
            elif op == 'media':
                import media_generation
                args = data.get('arguments', {})
                result = media_generation.operate(args)
                if args.get('action') == 'status' and result.get('state') == 'completed' and result.get('output') == 'image.png':
                    import base64
                    raw = (media_generation.folder(result['id']) / 'image.png').read_bytes()
                    if len(raw) <= 4000000:
                        result['result'] = {'image': 'data:image/png;base64,' + base64.b64encode(raw).decode()}
            elif op=='status':
                with LOCK:result=REQUESTS.get(data.get('id'),{'error':'Demande introuvable'})
            else:raise ValueError('Seules demande et consultation sont autorisées.')
        except Exception as exc:result={'error':str(exc)}
        self.wfile.write(json.dumps(result).encode()+b'\n')

def start():
    path=BASE/'tools.sock';path.unlink(missing_ok=True)
    server=socketserver.ThreadingUnixStreamServer(str(path),Handler);os.chmod(path,0o600)
    threading.Thread(target=server.serve_forever,daemon=True).start();return server
