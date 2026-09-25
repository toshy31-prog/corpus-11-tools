"""Hooks de worktree : configuration persistée et demande d'exécution explicite."""
import json,threading,uuid
from pathlib import Path
from corpus_paths import LOCAL_RUNTIME_ROOT
BASE=LOCAL_RUNTIME_ROOT
LOCK=threading.RLock()
def operate(data=None):
 with LOCK:
  file=BASE/'hooks.json';hooks=json.loads(file.read_text()) if file.exists() else []
  if data is not None:
   if data.get('operation')=='hook-remove':hooks=[h for h in hooks if h['id']!=data.get('id')]
   elif data.get('operation')=='hook-save':
    name=data.get('name','');script=data.get('script','')
    if not isinstance(name,str) or not name.strip() or len(name)>80 or not isinstance(script,str) or len(script)>6000:raise ValueError('Nom et script valides requis.')
    ident=data.get('id') or uuid.uuid4().hex
    hooks=[h for h in hooks if h['id']!=ident]+[{'id':ident,'name':name.strip(),'script':script,'enabled':data.get('enabled') is True,'event':'worktree.created'}]
   else:raise ValueError('Opération de hook inconnue.')
   temp=file.with_suffix('.tmp');temp.write_text(json.dumps(hooks));temp.replace(file)
  return {'hooks':hooks}
def created(path):
 import tool_gateway
 for hook in operate()['hooks']:
  if hook['enabled']:tool_gateway.submit({'action':'hook','name':hook['name'],'script':hook['script'],'worktree':path})
