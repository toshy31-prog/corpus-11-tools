import urllib.request,json,hashlib,concurrent.futures,time
from pathlib import Path
from corpus_paths import MEDIA_MODELS_ROOT, MEDIA_RUNTIME_ROOT
BASE=MEDIA_MODELS_ROOT;BASE.mkdir(parents=True,exist_ok=True)
RUNTIME_BASE=MEDIA_RUNTIME_ROOT
files=[(v['repository'],v['revision'],v['source_file'],v['file']) for v in json.loads(Path(__file__).with_name('MEDIA_MODELS_LOCK.json').read_text())]
def download(item):
 repo,rev,name,local=item;dest=BASE/local
 entry=next(v for v in json.loads(Path(__file__).with_name('MEDIA_MODELS_LOCK.json').read_text()) if v['file']==local);expected=entry['sha256'];size=entry['size']
 print('DOWNLOAD',local,round(size/1e9,2),'GB',flush=True)
 url=entry.get('source_url') or 'https://huggingface.co/'+repo+'/resolve/'+rev+'/'+name+'?download=true'
 candidate=dest if dest.exists() else dest.with_suffix(dest.suffix+'.partial')
 if not dest.exists():
  with urllib.request.urlopen(url,timeout=90) as source, dest.with_suffix(dest.suffix+'.partial').open('wb') as out:
   while chunk:=source.read(4*1024*1024):out.write(chunk)
 h=hashlib.sha256()
 with candidate.open('rb') as stream:
  while chunk:=stream.read(8*1024*1024):h.update(chunk)
 if candidate.stat().st_size!=size or h.hexdigest()!=expected:raise RuntimeError('Checksum mismatch '+local)
 if candidate!=dest:candidate.rename(dest)
 print('VERIFIED',local,flush=True)
 return entry
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex: results=list(ex.map(download,files))
(RUNTIME_BASE/'models-manifest.json').write_text(json.dumps(results,indent=2))

# Official pinned runtime, verified before extraction. No model pickle executed.
import zipfile, os
runtime=RUNTIME_BASE/'runtime'
archive=RUNTIME_BASE/'runtime.zip'
expected='28675635a82dd24970acd9600dc5f82a6eab1a54b66e962bb39dd51e3d2b7e47'
if not archive.exists():
 urllib.request.urlretrieve('https://github.com/leejet/stable-diffusion.cpp/releases/download/master-899-28b454b/sd-master-28b454b-bin-Linux-Ubuntu-24.04-x86_64-vulkan.zip',archive)
if hashlib.sha256(archive.read_bytes()).hexdigest()!=expected:raise RuntimeError('Runtime checksum mismatch')
with zipfile.ZipFile(archive) as z:
 for info in z.infolist():
  if not (runtime/info.filename).resolve().is_relative_to(runtime.resolve()):raise RuntimeError('Unsafe archive path')
 z.extractall(runtime)
for file in runtime.rglob('*'):
 if file.is_file():file.chmod(0o755)
print('Runtime ready:',runtime)

import shutil
shutil.copytree(Path(__file__).with_name('media_licenses'),RUNTIME_BASE/'licenses',dirs_exist_ok=True)
