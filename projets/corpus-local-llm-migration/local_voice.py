"""API audio locale, taille bornée, inférence isolée sans accès réseau."""
import base64
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
from corpus_paths import LOCAL_RUNTIME_ROOT

HERE = Path(__file__).resolve().parent
BASE = LOCAL_RUNTIME_ROOT
LOCK = threading.Lock()
MAX_AUDIO = 5 * 1024 * 1024

def transcribe(data):
    if not isinstance(data, dict) or not isinstance(data.get('audio'), str):
        raise ValueError('Audio attendu')
    audio = base64.b64decode(data['audio'], validate=True)
    if not 0 < len(audio) <= MAX_AUDIO:
        raise ValueError('Audio vide ou trop volumineux (5 Mo maximum)')
    if not LOCK.acquire(blocking=False):
        raise ValueError('Une transcription est déjà en cours')
    try:
        with tempfile.TemporaryDirectory(prefix='corpus-voice-') as tmp:
            path = Path(tmp) / 'audio';path.write_bytes(audio)
            env = {'PATH':'/usr/bin:/bin','HOME':tmp,'HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1',
                   'XDG_CACHE_HOME':tmp,'OMP_NUM_THREADS':'4'}
            command = ['bwrap','--unshare-net','--unshare-pid','--die-with-parent',
                       '--ro-bind','/','/','--tmpfs','/tmp','--tmpfs','/run','--proc','/proc','--dev','/dev',
                       '--ro-bind',tmp,tmp,str(BASE/'voice-env/bin/python'),str(HERE/'voice_worker.py'),str(path)]
            result = subprocess.run(command, env=env, capture_output=True, timeout=140, check=True)
            return json.loads(result.stdout)
    finally:
        LOCK.release()

def synthesize(data):
    text=data.get('text')
    if not isinstance(text,str) or not text.strip() or len(text)>4000:
        raise ValueError('Texte vide ou trop long')
    command=['bwrap','--unshare-net','--unshare-pid','--die-with-parent',
             '--ro-bind','/','/','--tmpfs','/tmp','--tmpfs','/run','--proc','/proc','--dev','/dev',
             '/usr/bin/python3',str(HERE/'speech_worker.py')]
    if not LOCK.acquire(blocking=False):raise ValueError('Moteur occupé')
    try:
        result=subprocess.run(command,input=json.dumps({'text':text,'voice':data.get('voice')}).encode(),
                              capture_output=True,timeout=30,check=True)
        return {'audio':base64.b64encode(result.stdout).decode(),'mime':'audio/wav'}
    finally:LOCK.release()

def response(method, body):
    code = '200 OK'
    try:
        if method == 'GET':
            result = {'installed':(BASE/'voice-env/bin/python').exists() and (BASE/'voice-model-small/model.bin').exists(),
                      'voices':['fr','en'],'model':'Whisper small · CPU int8','local_only':True,'max_seconds':60}
        elif method == 'POST':
            data=json.loads(body)
            result = synthesize(data) if isinstance(data,dict) and data.get('operation')=='speak' else transcribe(data)
        else:
            code='405 Method Not Allowed';result={'error':'Méthode non autorisée'}
    except (ValueError, OSError, subprocess.SubprocessError):
        code='400 Bad Request';result={'error':'Transcription impossible : audio invalide, moteur occupé ou délai dépassé.'}
    payload=json.dumps(result,ensure_ascii=False).encode()
    return (f'HTTP/1.1 {code}\r\nContent-Type: application/json\r\nContent-Length: {len(payload)}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n'.encode()+payload)
