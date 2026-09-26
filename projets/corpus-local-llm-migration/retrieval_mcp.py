"""Corpus hybrid retrieval MCP: FTS5 + sqlite-vec + Qwen embedding/reranker via local router."""
import json,sqlite3,sys,urllib.request
from pathlib import Path
from corpus_paths import DATA_ROOT,TOOLCHAINS_ROOT
DB=DATA_ROOT/'retrieval/index.sqlite'; VEC=TOOLCHAINS_ROOT/'extensions/sqlite-vec/v0.1.9'; ROUTER='http://127.0.0.1:18741'
TOOLS=[
 {'name':'memory_index_text','description':'Indexer un texte explicite dans la mémoire locale hybride Corpus.','inputSchema':{'type':'object','properties':{'id':{'type':'string','maxLength':200},'text':{'type':'string','maxLength':100000},'source':{'type':'string','maxLength':1000}},'required':['id','text'],'additionalProperties':False}},
 {'name':'memory_search','description':'Recherche locale hybride FTS + embedding + reranking.','inputSchema':{'type':'object','properties':{'query':{'type':'string','maxLength':2000},'limit':{'type':'integer','minimum':1,'maximum':20,'default':8}},'required':['query'],'additionalProperties':False}},
 {'name':'memory_delete','description':'Supprimer explicitement un document de l’index local.','inputSchema':{'type':'object','properties':{'id':{'type':'string','maxLength':200}},'required':['id'],'additionalProperties':False}}
]
def request(path,payload):
    r=urllib.request.Request(ROUTER+path,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(r,timeout=180) as x:return json.load(x)
def embed(text): return request('/v1/embeddings',{'model':'corpus-embed','input':text})['data'][0]['embedding']
def rerank(q,docs,limit):
    if not docs:return []
    out=request('/v1/rerank',{'model':'corpus-rerank','query':q,'documents':[d['text'] for d in docs],'top_n':min(limit,len(docs))})
    return [dict(docs[x['index']],score=x.get('relevance_score')) for x in out.get('results',[])]
def connect():
    DB.parent.mkdir(parents=True,exist_ok=True); con=sqlite3.connect(DB); con.execute('PRAGMA journal_mode=WAL')
    ext=next(iter(VEC.rglob('vec0.so')),None) or next(iter(VEC.rglob('*.so')),None)
    if ext:
        con.enable_load_extension(True);con.load_extension(str(ext));con.enable_load_extension(False)
    con.execute('CREATE TABLE IF NOT EXISTS docs(id TEXT PRIMARY KEY,source TEXT,text TEXT NOT NULL)')
    con.execute("CREATE VIRTUAL TABLE IF NOT EXISTS docs_fts USING fts5(id UNINDEXED,text,tokenize='unicode61 remove_diacritics 2')")
    con.execute('CREATE VIRTUAL TABLE IF NOT EXISTS docs_vec USING vec0(id TEXT PRIMARY KEY,embedding float[1024])')
    return con
def index(a):
    v=embed(a['text'])
    with connect() as c:
        c.execute('INSERT OR REPLACE INTO docs VALUES(?,?,?)',(a['id'],a.get('source',''),a['text']));c.execute('DELETE FROM docs_fts WHERE id=?',(a['id'],));c.execute('INSERT INTO docs_fts VALUES(?,?)',(a['id'],a['text']));c.execute('DELETE FROM docs_vec WHERE id=?',(a['id'],));c.execute('INSERT INTO docs_vec VALUES(?,?)',(a['id'],json.dumps(v)))
    return {'indexed':a['id'],'chars':len(a['text'])}
def search(a):
    q=a['query'];limit=int(a.get('limit',8));cand=set();v=embed(q)
    with connect() as c:
        terms=[x for x in q.replace('"',' ').split() if x][:12]
        if terms:
            try:
                match=' OR '.join('"'+x+'"' for x in terms)
                cand.update(r[0] for r in c.execute('SELECT id FROM docs_fts WHERE docs_fts MATCH ? ORDER BY bm25(docs_fts) LIMIT 40',(match,)))
            except sqlite3.Error:pass
        try:cand.update(r[0] for r in c.execute('SELECT id,distance FROM docs_vec WHERE embedding MATCH ? AND k=40',(json.dumps(v),)))
        except sqlite3.Error:pass
        docs=[]
        for ident in list(cand)[:80]:
            r=c.execute('SELECT id,source,text FROM docs WHERE id=?',(ident,)).fetchone()
            if r:docs.append({'id':r[0],'source':r[1],'text':r[2]})
    ranked=rerank(q,docs,limit);return {'results':[{**r,'text':r['text'][:12000]} for r in ranked]}
def delete(a):
    with connect() as c:
        for table in ('docs','docs_fts','docs_vec'):c.execute(f'DELETE FROM {table} WHERE id=?',(a['id'],))
    return {'deleted':a['id']}
for line in sys.stdin:
    req={}
    try:
        req=json.loads(line);m=req.get('method');p=req.get('params',{})
        if 'id' not in req:continue
        if m=='initialize':res={'protocolVersion':'2024-11-05','capabilities':{'tools':{}},'serverInfo':{'name':'corpus-retrieval','version':'1'}}
        elif m=='tools/list':res={'tools':TOOLS}
        elif m=='ping':res={}
        elif m=='tools/call':
            n=p['name'];a=p.get('arguments',{});val=index(a) if n=='memory_index_text' else search(a) if n=='memory_search' else delete(a) if n=='memory_delete' else (_ for _ in ()).throw(ValueError('outil inconnu'));res={'content':[{'type':'text','text':json.dumps(val,ensure_ascii=False)}]}
        else:raise ValueError('méthode inconnue')
        ans={'jsonrpc':'2.0','id':req['id'],'result':res}
    except Exception as e:ans={'jsonrpc':'2.0','id':req.get('id'),'error':{'code':-32603,'message':str(e)[:1200]}}
    print(json.dumps(ans),flush=True)
