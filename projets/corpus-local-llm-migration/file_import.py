"""Bounded document ingestion; originals retained, archive members never executed."""
import base64, hashlib, io, json, re, subprocess, tempfile, threading, zipfile
from pathlib import Path
import xml.etree.ElementTree as ET
from corpus_paths import ATTACHMENTS_DATA_ROOT, RUNTIME_ROOT
BASE=ATTACHMENTS_DATA_ROOT
COMPAT_BASE=RUNTIME_ROOT/'corpus-attachments'
MAX=60*1024*1024
LOCK=threading.RLock()

def extract(raw,suffix,d):
    if suffix=='.pdf':
        cmd=['bwrap','--unshare-net','--unshare-pid','--die-with-parent','--ro-bind','/usr','/usr','--ro-bind','/lib','/lib','--ro-bind','/lib64','/lib64','--proc','/proc','--dev','/dev','--tmpfs','/tmp','--bind',str(d),str(d),'pdftotext','-layout',str(d/('original'+suffix)),str(d/'content.txt')]
        subprocess.run(cmd,check=True,timeout=90,capture_output=True)
        out=d/'content.txt'
        if out.stat().st_size>30*1024*1024:out.unlink();raise ValueError('Texte extrait supérieur à 30 Mo ; scinder le PDF.')
        text=out.read_text(errors='replace')
        return text, 'Texte PDF extrait ; illustrations non interprétées. OCR nécessaire si document numérisé.'
    if zipfile.is_zipfile(io.BytesIO(raw)):
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            entries=z.infolist()
            if len(entries)>5000 or sum(f.file_size for f in entries)>200*1024*1024:raise ValueError('Archive limitée à 5000 entrées et 200 Mo décompressés.')
            if any(f.file_size>20*1024*1024 or f.file_size>max(1,f.compress_size)*200 for f in entries):raise ValueError('Archive trop compressée ou membre supérieur à 20 Mo.')
            office=suffix in ('.docx','.odt','.ods','.xlsx','.pptx','.odp','.epub')
            chunks=[]
            for f in entries:
                if f.is_dir():continue
                if office and f.filename.endswith(('.xml','.xhtml','.html')):
                    try:chunks.append(f.filename+'\n'+' '.join(ET.fromstring(z.read(f)).itertext()))
                    except ET.ParseError:continue
                elif not office:chunks.append(f.filename+' · '+str(f.file_size)+' octets')
            return '\n\n'.join(chunks), ('Extraction textuelle ; mise en page, formules et médias non restitués.' if office else 'Inventaire ZIP uniquement. Membres non extraits : demander une lecture ciblée de l’original.')
    text=raw.decode('utf-16' if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig')
    if '\0' in text:raise ValueError('Format binaire non pris en charge par ce lecteur.')
    return text,'Texte Unicode.'

def ingest(data):
    if not isinstance(data,dict):raise ValueError('Objet JSON attendu.')
    name=data.get('name','fichier');encoded=data.get('data','')
    if not isinstance(name,str) or not name.strip() or len(name)>300:raise ValueError('Nom de fichier requis, limité à 300 caractères.')
    if not isinstance(encoded,str) or len(encoded)>((MAX+2)//3)*4:raise ValueError('Fichier limité à 60 Mo.')
    raw=base64.b64decode(encoded,validate=True)
    if not 0<len(raw)<=MAX:raise ValueError('Fichier limité à 60 Mo.')
    suffix=Path(name).suffix.lower()
    if not re.fullmatch(r'\.[a-z0-9]{1,12}',suffix):suffix='.txt'
    digest=hashlib.sha256(raw).hexdigest();d=BASE/digest
    with LOCK:
        manifest=d/'metadata.json'
        if manifest.exists():
            metadata=json.loads(manifest.read_text())
            original=d/metadata['original']
            text=(d/'content.txt').read_text();notice=metadata['notice']
        else:
            BASE.mkdir(parents=True,exist_ok=True)
            # Publish only a complete, accepted import. Failed files leave no originals.
            with tempfile.TemporaryDirectory(prefix='.import-',dir=BASE) as tmp:
                work=Path(tmp);original=d/('original'+suffix)
                (work/original.name).write_bytes(raw)
                text,notice=extract(raw,suffix,work)
                (work/'content.txt').write_text(text)
                (work/'metadata.json').write_text(json.dumps({'original':original.name,'notice':notice}))
                d.mkdir(parents=True,exist_ok=True)
                for source in work.iterdir():source.replace(d/source.name)
    public=COMPAT_BASE/digest
    return {'name':name,'path':str(public/original.name),'textPath':str(public/'content.txt'),'preview':text[:12000],'characters':len(text),'notice':notice,'truncated':len(text)>12000}

def response(method,body):
    try:
        if method!='POST':raise ValueError('POST requis')
        result=ingest(json.loads(body));code='200 OK'
    except Exception as e:result={'error':str(e)[:300]};code='400 Bad Request'
    raw=json.dumps(result).encode();return f'HTTP/1.1 {code}\r\nContent-Type: application/json\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw
