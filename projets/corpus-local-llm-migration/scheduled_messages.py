"""Persistent local scheduler. Claimed requests are never silently replayed."""
import json
import sqlite3
import threading
import time
import uuid
import re
import urllib.request
from pathlib import Path
import chat_actions
from corpus_paths import LOCAL_RUNTIME_ROOT
DB = LOCAL_RUNTIME_ROOT/'schedules.sqlite'

def connect():
    DB.parent.mkdir(parents=True, exist_ok=True)
    db=sqlite3.connect(DB,timeout=10)
    db.row_factory=sqlite3.Row
    db.execute('CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, session TEXT, directory TEXT, text TEXT, at REAL, state TEXT)')
    return db

def operate(data):
    if not isinstance(data,dict): raise ValueError('Objet attendu.')
    action=data.get('action','list')
    with connect() as db:
        if action=='create':
            session=data.get('session','');text=data.get('text','');at=data.get('at',0)
            if not re.fullmatch(r'ses_[A-Za-z0-9]+',session) or not isinstance(text,str) or not 0<len(text)<=6000 or not isinstance(at,(float,int)) or not time.time()*1000<at<time.time()*1000+366*86400000: raise ValueError('Échéance invalide.')
            directory=chat_actions.project(data.get('directory',''))
            job_id=data.get('id') or str(uuid.uuid4())
            if not isinstance(job_id,str) or not re.fullmatch(r'[A-Za-z0-9_-]{10,80}',job_id): raise ValueError('Identifiant invalide.')
            existing=db.execute('SELECT * FROM jobs WHERE id=?',(job_id,)).fetchone()
            if existing and any(existing[key]!=value for key,value in [('session',session),('directory',directory),('text',text),('at',at)]): raise ValueError('Identifiant déjà utilisé.')
            db.execute('INSERT OR IGNORE INTO jobs VALUES(?,?,?,?,?,?)',(job_id,session,directory,text,at,'pending'))
        elif action=='cancel':
            db.execute("UPDATE jobs SET state='cancelled' WHERE id=? AND state='pending'",(data.get('id'),))
        elif action!='list': raise ValueError('Action inconnue.')
        return {'jobs':[dict(r) for r in db.execute('SELECT * FROM jobs ORDER BY at DESC')]}

def tick():
    with connect() as db:
        jobs=[dict(r) for r in db.execute("SELECT * FROM jobs WHERE state='pending' AND at<=?",(time.time()*1000,))]
    for job in jobs:
        try:
            request=urllib.request.Request('http://127.0.0.1:18743/session/status',headers={'x-opencode-directory':job['directory']})
            with urllib.request.urlopen(request,timeout=10) as r: states=json.load(r)
            if states.get(job['session'],{}).get('type','idle')!='idle': continue
            with connect() as db:
                if db.execute("UPDATE jobs SET state='claimed' WHERE id=? AND state='pending'",(job['id'],)).rowcount!=1: continue
            body={'agent':'corpus','parts':[{'type':'text','text':job['text']}], 'system':'Message planifié. Heure actuelle UTC : '+time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
            request=urllib.request.Request('http://127.0.0.1:18743/session/'+job['session']+'/prompt_async',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','x-opencode-directory':job['directory']})
            with urllib.request.urlopen(request,timeout=30): pass
            with connect() as db: db.execute("UPDATE jobs SET state='delivered' WHERE id=?",(job['id'],))
        except Exception:
            with connect() as db: db.execute("UPDATE jobs SET state='uncertain' WHERE id=? AND state='claimed'",(job['id'],))

def start():
    with connect() as db: db.execute("UPDATE jobs SET state='uncertain' WHERE state='claimed'")
    def run():
        while True:
            try: tick()
            except Exception: pass
            time.sleep(5)
    threading.Thread(target=run,daemon=True).start()

def response(method,body):
    try:
        if method not in ('GET','POST'):raise ValueError('Méthode non autorisée.')
        value=operate(json.loads(body) if method=='POST' else {});status='200 OK'
    except (ValueError,TypeError,OSError,sqlite3.Error): value={'error':'Requête de planification invalide.'};status='400 Bad Request'
    raw=json.dumps(value).encode();return f'HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw
