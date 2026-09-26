"""Documents locaux : contenu explicite, conversions isolées, liens persistants."""
import csv, io, json, re, subprocess, threading, time, uuid
from pathlib import Path
from xml.sax.saxutils import escape
from corpus_paths import DOCUMENTS_DATA_ROOT, OFFICE_RUNTIME_ROOT
BASE=DOCUMENTS_DATA_ROOT
FORMATS=['txt','md','html','odt','docx','rtf','pdf','epub','pptx','odp','csv','tsv','ods','xlsx']
OFFICE=OFFICE_RUNTIME_ROOT/'root'
GATE=threading.Semaphore(1)
LOCK=threading.RLock()
def folder(i):
    if not re.fullmatch('[a-f0-9]{32}',i): raise ValueError('Identifiant invalide')
    return BASE/i

def save(j):
    p=folder(j['id']);p.mkdir(parents=True,exist_ok=True)
    tmp=p/'job.tmp';tmp.write_text(json.dumps(j,ensure_ascii=False));tmp.replace(p/'job.json')

def read(i): return json.loads((folder(i)/'job.json').read_text())

def jobs():
    """One damaged record must not disable other documents or server startup."""
    result=[]
    for path in BASE.glob('*/job.json'):
        try:
            job=json.loads(path.read_text())
            if not isinstance(job,dict) or job.get('id')!=path.parent.name or job.get('state') not in ('queued','running','completed','failed') or type(job.get('created',0)) not in (int,float):
                continue
            result.append(job)
        except (ValueError,OSError):
            continue
    return sorted(result,key=lambda job:job.get('created',0),reverse=True)
def run(args,d):
    cmd=['bwrap','--unshare-net','--unshare-pid','--die-with-parent','--ro-bind','/usr','/usr','--ro-bind','/etc','/etc','--ro-bind','/lib','/lib','--ro-bind','/lib64','/lib64','--symlink','usr/bin','/bin','--ro-bind',str(OFFICE/'registry'),'/etc/libreoffice/registry','--ro-bind',str(OFFICE/'libreoffice'),'/usr/lib/libreoffice','--ro-bind',str(OFFICE/'share-libreoffice'),'/usr/share/libreoffice','--ro-bind',str(OFFICE/'usr/lib/x86_64-linux-gnu'),'/opt/corpus-libs','--proc','/proc','--dev','/dev','--tmpfs','/tmp','--bind',str(d),str(d),'--chdir',str(d),*args]
    r=subprocess.run(cmd,capture_output=True,timeout=90,env={'PATH':'/usr/bin:/bin','HOME':'/tmp','LANG':'C.UTF-8','SAL_USE_VCLPLUGIN':'svp','LD_LIBRARY_PATH':'/opt/corpus-libs'})
    with (d/'conversion.log').open('ab') as f:f.write(r.stdout+r.stderr)
    if r.returncode: raise RuntimeError('Conversion échouée ; consulter conversion.log')

def office(src,ext,d):
    run(['/usr/bin/libreoffice','-env:UserInstallation=file:///tmp/corpus-office','--headless','--convert-to',ext,'--outdir',str(d),str(src)],d)

def execute(j):
    with GATE:
        d=folder(j['id']);fmt=j['format']
        try:
            j.update(state='running');save(j)
            if fmt in ['csv','tsv','ods','xlsx']:
                rows=j['rows']
                if fmt in ['csv','tsv']:
                    with (d/('document.'+fmt)).open('w',newline='') as f:
                        csv.writer(f,delimiter='\t' if fmt=='tsv' else ',').writerows([["'"+v if isinstance(v,str) and v.lstrip().startswith(('=','+','-','@')) else v for v in row] for row in rows])
                else:
                    cells=[]
                    for row in rows:
                        cells.append('<table:table-row>')
                        for v in row:
                            numeric=isinstance(v,(int,float)) and not isinstance(v,bool)
                            cells.append('<table:table-cell office:value-type="'+('float" office:value="'+str(v) if numeric else 'string')+'"><text:p>'+escape(str(v))+'</text:p></table:table-cell>')
                        cells.append('</table:table-row>')
                    (d/'document.fods').write_text('<?xml version="1.0" encoding="UTF-8"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.spreadsheet"><office:body><office:spreadsheet><table:table table:name="Données">'+''.join(cells)+'</table:table></office:spreadsheet></office:body></office:document>')
                    office(d/'document.fods',fmt,d)
            elif fmt in ['txt','md']:(d/('document.'+fmt)).write_text(j['content'])
            else:
                (d/'source.md').write_text(j['content'])
                intermediate='odt' if fmt=='pdf' else 'pptx' if fmt=='odp' else fmt
                run(['/usr/bin/pandoc','--from=markdown-raw_html-raw_tex-yaml_metadata_block','--standalone','source.md','-o','document.'+intermediate],d)
                if fmt in ['pdf','odp']:office(d/('document.'+intermediate),fmt,d)
            out=d/('document.'+fmt)
            if not out.is_file() or not out.stat().st_size:raise RuntimeError('Aucun fichier produit')
            j.update(state='completed',url='/corpus/documents/'+j['id']+'/document.'+fmt,bytes=out.stat().st_size)
        except Exception as e:j.update(state='failed',error=str(e))
        j['finished']=time.time();save(j)

def operate(data):
    if not isinstance(data,dict):raise ValueError('Objet JSON attendu.')
    action=data.get('action','list')
    if action=='status':return read(data.get('id',''))
    if action=='list':return {'formats':FORMATS,'jobs':jobs()[:30]}
    if action!='create':raise ValueError('Action inconnue')
    fmt=data.get('format');content=data.get('content','');rows=data.get('rows',[])
    if fmt not in FORMATS:raise ValueError('Format non pris en charge')
    if not isinstance(content,str) or len(content)>15000:raise ValueError('Texte limité à 15000 caractères')
    if fmt in ['csv','tsv','ods','xlsx']:
        if not isinstance(rows,list) or not 1<=len(rows)<=1000:raise ValueError('Tableau de 1 à 1000 lignes requis')
        for row in rows:
            if not isinstance(row,list) or len(row)>100 or any(type(v) not in (str,int,float) or len(str(v))>2000 for v in row):raise ValueError('Cellules invalides')
            if any(isinstance(v,float) and not __import__('math').isfinite(v) for v in row):raise ValueError('Nombre non fini')
    elif not content.strip():raise ValueError('Contenu requis')
    if len(json.dumps(rows))>15000:raise ValueError('Tableau trop volumineux')
    with LOCK:
        if sum(j.get('state') in ('queued','running') for j in jobs())>=8:raise ValueError('File pleine')
        j={'id':uuid.uuid4().hex,'format':fmt,'content':content,'rows':rows,'state':'queued','created':time.time()};save(j)
    threading.Thread(target=execute,args=(j,),daemon=True).start();return j

def response(method,body):
    try:
        if method not in ('GET','POST'):raise ValueError('Méthode non autorisée.')
        value=operate(json.loads(body) if method=='POST' else {});code='200 OK'
    except Exception as e:value={'error':str(e)};code='400 Bad Request'
    raw=json.dumps(value,ensure_ascii=False).encode();return f'HTTP/1.1 {code}\r\nContent-Type: application/json\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw

def asset(path):
    m=re.fullmatch(r'/corpus/documents/([a-f0-9]{32})/document\.([a-z0-9]+)',path)
    try:
        if not m:raise ValueError()
        j=read(m[1])
        if j['state']!='completed' or j['format']!=m[2]:raise ValueError()
        raw=(folder(m[1])/('document.'+m[2])).read_bytes()
        return f'HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename="document.{m[2]}"\r\nX-Content-Type-Options: nosniff\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw
    except Exception:return b'HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n'


def recover():
    for j in jobs():
        if j['state'] in ('queued','running'):
            j.update(state='failed',error='Interrompu au redémarrage ; relancer explicitement.');save(j)
