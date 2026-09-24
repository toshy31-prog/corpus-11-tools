"""Agrégats locaux, lecture seule ; aucun texte de conversation n'est retourné."""
import json
import sqlite3
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
DB=Path(__file__).resolve().parents[2]/'.dev-local/corpus-local/data/opencode/opencode.db'
TZ=ZoneInfo('Europe/Paris')

def aggregate(days=7,db=DB,now=None):
    if days not in (7,30):raise ValueError('Période attendue : 7 ou 30 jours.')
    now=now or datetime.now(TZ)
    dates=[(now.date()-timedelta(days=i)).isoformat() for i in reversed(range(days))]
    start=int(datetime.fromisoformat(dates[0]).replace(tzinfo=TZ).timestamp()*1000)
    end=int(now.timestamp()*1000)
    metrics={k:{} for k in ('tokens','turns','tools','skills')}
    counters={'assistant_messages':0,'completed':0,'errors':0,'tokens_reported':0,'tokens_missing':0,'duration_ms':0}
    def count(metric,group,date,value=1):
        values=metrics[metric].setdefault(group,[0]*days);values[dates.index(date)]+=value
    def day(timestamp):return datetime.fromtimestamp(timestamp/1000,TZ).date().isoformat()
    def number(v):return v if isinstance(v,(int,float)) and not isinstance(v,bool) and v>=0 else 0
    with sqlite3.connect(f'file:{db}?mode=ro',uri=True,timeout=3) as c:
        c.execute('BEGIN')
        sessions=c.execute('select count(*) from session').fetchone()[0]
        messages=c.execute('select id,time_created,data from message where time_created>=? and time_created<=?',(start,end)).fetchall()
        parents=set()
        for ident,created,raw in messages:
            d=json.loads(raw)
            if d.get('role')!='assistant':continue
            date=day(created);model=d.get('modelID') or 'Modèle non renseigné'
            counters['assistant_messages']+=1
            parent=d.get('parentID') or ident
            if parent not in parents:count('turns',model,date);parents.add(parent)
            if d.get('error'):counters['errors']+=1
            completed=d.get('time',{}).get('completed')
            if completed:
                counters['completed']+=1
                counters['duration_ms']+=max(0,completed-created)
            tokens=d.get('tokens') or {}
            # Entrées + sorties uniquement ; raisonnement/cache séparés selon fournisseurs.
            value=number(tokens.get('input'))+number(tokens.get('output'))
            if value>0:
                count('tokens',model,date,value);counters['tokens_reported']+=1
            else:counters['tokens_missing']+=1
        for created,raw in c.execute('select time_created,data from part where time_created>=? and time_created<=?',(start,end)):
            d=json.loads(raw)
            if d.get('type')!='tool':continue
            state=d.get('state') or {}
            if state.get('status')!='completed':continue
            name=d.get('tool','outil inconnu');date=day(created)
            count('tools',name,date)
            args=state.get('input') or {}
            if isinstance(args,dict) and ('plugin_read' in name or name=='skill'):
                path=args.get('path','');skill=args.get('name') if name=='skill' else Path(path).parent.name if path.endswith('/SKILL.md') else None
                if skill:count('skills',skill,date)
    return {'days':days,'dates':dates,'updated_at':now.isoformat(),'timezone':str(TZ),'sessions':sessions,
            'metrics':metrics,'counters':counters,'review':{'available':False,'reason':'Aucune télémétrie de revue de code dédiée n’est enregistrée. Les appels Git ordinaires ne sont pas comptés comme des revues.'},
            'notes':['Source : base OpenCode locale, sans les conversations Codex importées.',
                     'Tours : demandes parentes distinctes ayant reçu au moins un message assistant.',
                     'Tokens : entrées + sorties déclarées, hors cache et sans ajout du raisonnement ; les valeurs absentes ou nulles ne prouvent pas une consommation nulle.',
                     'Outils : appels terminés ; lecture d’un SKILL.md comptée comme consultation, pas comme preuve d’application.',
                     'Aucun quota cloud, coût électrique ou pourcentage de forfait n’est calculé.']}

def response(method,body):
    try:
        if method not in ('GET','POST'):raise ValueError('Méthode non autorisée.')
        data=json.loads(body) if method=='POST' else {}
        if not isinstance(data,dict):raise ValueError('Objet JSON attendu.')
        value=aggregate(data.get('days',7));status='200 OK'
    except (ValueError,TypeError,OSError,sqlite3.Error) as e:value={'error':str(e)};status='503 Service Unavailable'
    except (AttributeError,KeyError,OverflowError):value={'error':'Historique local incohérent ou incomplet.'};status='503 Service Unavailable'
    raw=json.dumps(value,ensure_ascii=False).encode()
    return f'HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw
