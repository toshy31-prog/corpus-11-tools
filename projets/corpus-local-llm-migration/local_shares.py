"""Immutable, revocable loopback-only conversation snapshots."""
import html
import json
import secrets
import re
from pathlib import Path
from corpus_paths import LOCAL_RUNTIME_ROOT
BASE=LOCAL_RUNTIME_ROOT/'shares'

def operate(data):
    if not isinstance(data,dict): raise ValueError('Objet attendu.')
    BASE.mkdir(parents=True,exist_ok=True,mode=0o700)
    action=data.get('action')
    if action=='create':
        title=data.get('title','Conversation');text=data.get('text')
        if not isinstance(text,str) or not 0<len(text)<=500000 or not isinstance(title,str) or len(title)>300: raise ValueError('Instantané trop volumineux ou invalide.')
        token=secrets.token_urlsafe(24);path=BASE/(token+'.json')
        with path.open('x') as f: json.dump({'title':title,'text':text},f,ensure_ascii=False)
        path.chmod(0o600)
        return {'token':token,'path':'/corpus/share/'+token,'local_only':True}
    if action=='revoke':
        token=data.get('token','')
        if not re.fullmatch('[A-Za-z0-9_-]{32}',token): raise ValueError('Identifiant invalide.')
        (BASE/(token+'.json')).unlink(missing_ok=True)
        return {'revoked':True}
    raise ValueError('Action inconnue.')

def page(token):
    if not re.fullmatch('[A-Za-z0-9_-]{32}',token): return None
    try: data=json.loads((BASE/(token+'.json')).read_text())
    except (OSError,ValueError): return None
    raw=('<!doctype html><meta charset="utf-8"><title>'+html.escape(data['title'])+'</title><style>body{max-width:850px;margin:60px auto;padding:20px;font:16px/1.6 sans-serif}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><p>Instantané local · lecture seule</p><h1>'+html.escape(data['title'])+'</h1><pre>'+html.escape(data['text'])+'</pre>').encode()
    return b'HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nContent-Security-Policy: default-src \'none\'; style-src \'unsafe-inline\'; frame-ancestors \'none\'\r\nReferrer-Policy: no-referrer\r\nContent-Length: '+str(len(raw)).encode()+b'\r\nConnection: close\r\n\r\n'+raw

def response(method,body):
    try:
        if method!='POST': raise ValueError('POST requis.')
        value=operate(json.loads(body));code='200 OK'
    except (ValueError,TypeError,OSError): value={'error':'Partage local impossible.'};code='400 Bad Request'
    raw=json.dumps(value).encode();return f'HTTP/1.1 {code}\r\nContent-Type: application/json\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw
