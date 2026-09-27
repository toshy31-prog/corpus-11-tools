"""Agrégats locaux, lecture seule ; aucun texte de conversation n'est retourné."""
import json
import sqlite3
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
from corpus_paths import LOCAL_RUNTIME_ROOT
from e2e_timing import summarize as summarize_e2e
from prefix_cache_telemetry import summary as prefix_cache_summary
from cache_latency import summarize as cache_latency_summary
from performance_admission import admit as admit_performance_experiment, SCHEMA as PERFORMANCE_ADMISSION_SCHEMA
from performance_experiment import DEFAULT_IMMUTABLES
from comparable_measurement import compare_identities, validate as validate_comparable_measurement
DB=LOCAL_RUNTIME_ROOT/'data/opencode/opencode.db'
E2E_RECEIPT=Path(__file__).resolve().parent/'.migration-smoke/durable-e2e-v2-result.json'
COMPARABLE_MEASUREMENT_REFERENCE=Path(__file__).resolve().parent/'.migration-smoke/comparable-measurement-reference.json'
COMPARABLE_MEASUREMENT_CANDIDATE=Path(__file__).resolve().parent/'.migration-smoke/comparable-measurement-candidate.json'
TZ=ZoneInfo('Europe/Paris')

def e2e_status(path=None):
    try:
        path=path or E2E_RECEIPT
        if not path.is_file() or path.stat().st_size > 3_000_000:
            raise ValueError('Mesure absente.')
        receipt = json.loads(path.read_text())
        timing=summarize_e2e(receipt)
        calls = [tool for step in timing['assistant_steps'] for tool in step['tools']]
        bash_outputs = [part.get('state', {}).get('output', '') for row in receipt.get('messages', []) if isinstance(row, dict)
                        for part in row.get('parts', []) if isinstance(part, dict) and part.get('type') == 'tool' and part.get('tool') == 'bash']
        test_passed = any(isinstance(output, str) and 'MIGRATION_SMOKE_V2_PASS' in output for output in bash_outputs)
        completed = receipt.get('state') == 'completed' and receipt.get('agent_report', {}).get('outcome') == 'completed'
        execution_verified = completed and test_passed and all(call['status'] == 'completed' for call in calls)
        return {'available':True,'timing':{key:timing[key] for key in (
            'wall_seconds_from_transcript','recorded_tool_execution_seconds',
            'assistant_turn_seconds_excluding_recorded_tools')},
            'scope':timing['scope'],
            'validation': {'state': 'verified_local_receipt' if execution_verified else 'incomplete_local_receipt',
                           'read_edit_test_chain': execution_verified,
                           'tool_count': len(calls),
                           'limits': 'Le reçu confirme une épreuve locale bornée ; il ne vérifie ni la qualité générale, ni une autonomie générale, ni un effet indépendant.'}}
    except (OSError,ValueError,json.JSONDecodeError,KeyError,TypeError):
        return {'available':False}

def comparable_measurement_status(reference=None, candidate=None):
    """Expose only a safe readiness label for optional saved measurement envelopes.

    The statistics response deliberately returns neither the envelopes nor their
    hashes.  This is a read-only presentation of declarations already written by
    a separate, explicit measurement process.
    """
    reference = reference or COMPARABLE_MEASUREMENT_REFERENCE
    candidate = candidate or COMPARABLE_MEASUREMENT_CANDIDATE
    present = [path.is_file() and path.stat().st_size <= 100_000 for path in (reference, candidate)]
    if not any(present):
        return {'state': 'ready', 'measurements': 0,
                'detail': 'Contrat de mesure prêt. Aucune épreuve comparable enregistrée.',
                'limit': 'Cette vue ne lance aucun modèle et ne collecte aucune donnée.'}
    if not all(present):
        try:
            existing = reference if present[0] else candidate
            validate_comparable_measurement(json.loads(existing.read_text()))
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            return {'state': 'not_comparable', 'measurements': 0,
                    'detail': 'Reçu de mesure incomplet ou invalide.',
                    'limit': 'Aucun contenu, session, chemin ou commande n’est affiché.'}
        return {'state': 'observed', 'measurements': 1,
                'detail': 'Une épreuve est enregistrée ; une seconde identique est requise pour comparer.',
                'limit': 'Un reçu déclaratif ne prouve pas un effet du cache ni une qualité générale.'}
    try:
        baseline = json.loads(reference.read_text())
        candidate_value = json.loads(candidate.read_text())
        comparison = compare_identities(baseline, candidate_value)
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        return {'state': 'not_comparable', 'measurements': 0,
                'detail': 'Reçus de mesure absents, trop volumineux ou invalides.',
                'limit': 'Aucun contenu, session, chemin ou commande n’est affiché.'}
    comparable = comparison['comparability_state'] == 'declared_comparable_not_causally_attributed'
    return {'state': 'observed' if comparable else 'not_comparable', 'measurements': 2,
            'detail': ('Deux épreuves déclarent les mêmes conditions ; l’écart de durée reste non attribué.'
                       if comparable else 'Les deux épreuves ne portent pas les mêmes conditions déclarées.'),
            'limit': 'Même comparable, cette vue ne conclut ni à un effet causal du cache ni à une amélioration générale.'}

def cache_experiment_admission(prefix_cache, cache_latency):
    """Explain whether aggregate cache evidence justifies one future A/B run."""
    try:
        return admit_performance_experiment({
            'schema': PERFORMANCE_ADMISSION_SCHEMA,
            'experiment': 'cache-reuse-compatibility',
            # Labels intentionally avoid prescribing an unverified server flag.
            'variation': {'key': 'cache_reuse_compatible_candidate',
                          'baseline': 'current', 'candidate': 'validated_candidate'},
            'immutable_fields': list(DEFAULT_IMMUTABLES),
            'evidence': {'prefix_cache': prefix_cache, 'cache_latency': cache_latency},
        })
    except (ValueError, TypeError, KeyError):
        return {'available': False, 'decision': 'evidence_unavailable'}

def evidence_overview(e2e, cache_admission, comparable_measurement=None):
    """Classify local evidence by axis without producing a global score."""
    cache_decision = cache_admission.get('decision') if isinstance(cache_admission, dict) else None
    cache_state = 'deferred' if cache_decision in {'defer_qwen_experiment', 'evidence_unavailable'} else 'unknown'
    measurement = comparable_measurement or {'state': 'unknown'}
    axes = [
        {'id': 'agent_turns', 'label': 'Tours agents', 'state': 'unknown',
         'detail': 'Des états de tour sont observés localement, mais ni leur pertinence ni leur effet réel ne sont vérifiés.'},
        {'id': 'e2e', 'label': 'Épreuve bout en bout', 'state': 'verified' if e2e.get('validation', {}).get('state') == 'verified_local_receipt' else 'unknown',
         'detail': 'Chaîne locale lecture/modification/test vérifiée dans le reçu borné.' if e2e.get('validation', {}).get('state') == 'verified_local_receipt' else ('Un reçu local est disponible mais incomplet.' if e2e.get('available') else 'Aucun reçu local disponible.')},
        {'id': 'cache', 'label': 'Cache et vitesse', 'state': cache_state,
         'detail': 'Une expérience groupée reste différée ; aucun essai modèle n’est lancé ici.' if cache_state == 'deferred' else 'Aucune décision d’expérience exploitable.'},
        {'id': 'comparable_measurement', 'label': 'Mesure comparable', 'state': 'deferred' if measurement.get('state') == 'ready' else 'unknown',
         'detail': measurement.get('detail', 'Aucun reçu de mesure comparable disponible.')},
        {'id': 'code_review', 'label': 'Revue de code', 'state': 'unknown',
         'detail': 'Aucune télémétrie de revue dédiée n’est enregistrée.'},
        {'id': 'scenario_bank', 'label': 'Épreuves de scénarios', 'state': 'deferred',
         'detail': 'Les cas sont préparés, mais les résultats restent à enregistrer et vérifier séparément.'},
    ]
    counts = {state: sum(axis['state'] == state for axis in axes) for state in ('verified', 'deferred', 'rejected', 'unknown')}
    return {'axes': axes, 'counts': counts,
            'limit': 'Ces catégories décrivent le niveau de preuve par axe ; elles ne forment ni une note ni un pourcentage de maturité.'}

def aggregate(days=7,db=DB,now=None):
    if days not in (7,30):raise ValueError('Période attendue : 7 ou 30 jours.')
    now=now or datetime.now(TZ)
    dates=[(now.date()-timedelta(days=i)).isoformat() for i in reversed(range(days))]
    start=int(datetime.fromisoformat(dates[0]).replace(tzinfo=TZ).timestamp()*1000)
    end=int(now.timestamp()*1000)
    metrics={k:{} for k in ('tokens','cache_read','cache_write','turns','tools','skills','reliability')}
    counters={'assistant_messages':0,'completed':0,'errors':0,'tokens_reported':0,'tokens_missing':0,'duration_ms':0,
              'cache_read_reported':0,'cache_write_reported':0,
              'cache_read_messages':0,'cache_write_messages':0,
              'agent_turns_observed':0,'agent_turns_normal':0,'agent_turns_interrupted_or_error':0,
              'agent_turns_incomplete':0}
    failure_causes={}
    def count(metric,group,date,value=1):
        values=metrics[metric].setdefault(group,[0]*days);values[dates.index(date)]+=value
    def day(timestamp):return datetime.fromtimestamp(timestamp/1000,TZ).date().isoformat()
    def number(v):return v if isinstance(v,(int,float)) and not isinstance(v,bool) and v>=0 else 0
    with sqlite3.connect(f'file:{db}?mode=ro',uri=True,timeout=3) as c:
        c.execute('BEGIN')
        sessions=c.execute('select count(*) from session').fetchone()[0]
        messages=c.execute('select id,time_created,data from message where time_created>=? and time_created<=?',(start,end)).fetchall()
        parents=set()
        agent_attempts={}
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
            cache=tokens.get('cache') if isinstance(tokens.get('cache'),dict) else {}
            for metric,key in (('cache_read','read'),('cache_write','write')):
                cached=number(cache.get(key))
                if cached:
                    count(metric,model,date,cached)
                    counters[metric+'_reported']+=cached
                    counters[metric+'_messages']+=1
            parent_id=d.get('parentID')
            if isinstance(parent_id,str) and parent_id:
                agent_attempts.setdefault(parent_id,[]).append((created,ident,d))
        abnormal_finish={'unknown','other','error'}
        for attempts in agent_attempts.values():
            created,_,last=max(attempts,key=lambda row:(row[0],row[1]))
            time=last.get('time') if isinstance(last.get('time'),dict) else {}
            if last.get('error') or last.get('finish') in abnormal_finish:
                state='interrupted_or_error'
            elif not isinstance(time.get('completed'),(int,float)):
                state='incomplete'
            else:
                state='normal'
            count('reliability',state,day(created))
            counters['agent_turns_observed']+=1
            counters['agent_turns_'+state]+=1
            if state != 'normal':
                error=last.get('error')
                name=error.get('name') if isinstance(error,dict) else None
                if isinstance(name,str) and 0 < len(name) <= 80:
                    cause='error:'+name
                elif last.get('finish') in abnormal_finish:
                    cause='finish:'+last['finish']
                else:
                    cause='incomplete'
                failure_causes[cause]=failure_causes.get(cause,0)+1
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
    prefix_cache = prefix_cache_summary()
    cache_latency = cache_latency_summary(db, start, end)
    e2e = e2e_status()
    cache_admission = cache_experiment_admission(prefix_cache, cache_latency)
    comparable_measurement = comparable_measurement_status()
    return {'days':days,'dates':dates,'updated_at':now.isoformat(),'timezone':str(TZ),'sessions':sessions,
            'metrics':metrics,'counters':counters,'failure_causes':failure_causes,
            'e2e':e2e,
            'prefix_cache':prefix_cache,
            'cache_latency':cache_latency,
            'cache_experiment_admission':cache_admission,
            'comparable_measurement':comparable_measurement,
            'evidence_overview':evidence_overview(e2e, cache_admission, comparable_measurement),
            'review':{'available':False,'reason':'Aucune télémétrie de revue de code dédiée n’est enregistrée. Les appels Git ordinaires ne sont pas comptés comme des revues.'},
            'notes':['Source : base OpenCode locale, sans les conversations Codex importées.',
                     'Tours : demandes parentes distinctes ayant reçu au moins un message assistant.',
                     'Tokens : entrées + sorties déclarées, hors cache et sans ajout du raisonnement ; les valeurs absentes ou nulles ne prouvent pas une consommation nulle.',
                     'Cache déclaré : lecture et écriture de cache rapportées par le moteur, séparées des tokens ordinaires. Ces compteurs ne prouvent pas la cause ni le taux de réussite du cache KV.',
                     'Outils : appels terminés ; lecture d’un SKILL.md comptée comme consultation, pas comme preuve d’application.',
                     'Fiabilité agent : dernier état assistant observé par demande parente ; ni qualité sémantique, ni effet réel sur les fichiers ne sont déduits.',
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
