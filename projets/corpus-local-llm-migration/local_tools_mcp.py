"""MCP stdio : le modèle demande des actions, seul le portail les approuve."""
import json,socket,sys,subprocess
from pathlib import Path
from corpus_paths import (
    CAPABILITIES_RUNTIME_ROOT,
    HUGGINGFACE_CACHE_ROOT,
    HUGGINGFACE_HUB_CACHE_ROOT,
    LOCAL_RUNTIME_ROOT,
    contract_environment,
)
ROOT=Path(__file__).resolve().parents[2]
SOCKET=LOCAL_RUNTIME_ROOT/'tools.sock'
CAP=CAPABILITIES_RUNTIME_ROOT
DOCLING_PYTHON=CAP/'venvs/docling/bin/python'
DOCLING_HELPER=Path(__file__).resolve().parent/'docling_extract.py'
TOOLS=[{'name':'browser_request','description':'Demander une action du navigateur Corpus. La session Chromium est partagée avec le panneau Navigateur à droite de Corpus : Utiliser snapshot pour observer la page et ses sélecteurs interactifs avant click/fill, ou screenshot pour la voir. Chaque demande doit être approuvée dans ce panneau ou Paramètres > Navigateur. Ne pas répéter une demande en attente.','inputSchema':{'type':'object','properties':{'action':{'type':'string','enum':['tab-new','tab-select','tab-close','forward','launch','navigate','snapshot','screenshot','click','fill','back','reload','clear','close','download']},'tab':{'type':'string','description':'Identifiant retourné dans tabs pour sélectionner ou fermer un onglet.'},'visible':{'type':'boolean','description':'Ouvrir une fenêtre Chromium dédiée (launch uniquement ; ne pas remplacer une session existante).'},'url':{'type':'string'},'selector':{'type':'string'},'text':{'type':'string'}},'required':['action'],'additionalProperties':False}}, {'name':'browser_result','description':'Consulter le résultat d’une demande après validation humaine.','inputSchema':{'type':'object','properties':{'id':{'type':'string'}},'required':['id'],'additionalProperties':False}}]
def call(data):
    with socket.socket(socket.AF_UNIX) as peer:
        peer.settimeout(10);peer.connect(str(SOCKET));peer.sendall(json.dumps(data).encode()+b'\n')
        with peer.makefile('rb') as stream:return json.loads(stream.readline(8000000))
TOOLS.append({'name':'ssh_request','description':'Demander une commande SSH distante ; validation humaine requise avant toute connexion. Clés SSH existantes uniquement, clé hôte déjà connue requise.', 'inputSchema':{'type':'object','properties':{'host':{'type':'string'},'user':{'type':'string'},'port':{'type':'integer'},'command':{'type':'string'}},'required':['host','user','command'],'additionalProperties':False}})
TOOLS.append({'name':'git_request','description':'Demander status/diff/push/création PR brouillon/fusion. Validation humaine avant exécution. Ne jamais prétendre qu’une demande en attente est exécutée.','inputSchema':{'type':'object','properties':{'task':{'type':'string','enum':['status','diff','push','pr-create','pr-merge']},'project':{'type':'string'},'title':{'type':'string'},'body':{'type':'string'},'number':{'type':'integer'},'squash':{'type':'boolean'}},'required':['task'],'additionalProperties':False}})
for name,description,properties,required in [
 ('plugins_list','Lister les méthodes locales activées dans Paramètres > Plugins. Consulter avant de choisir une méthode.',{},[]),
 ('plugin_resources','Lister les fichiers de méthode et scripts consultables d’un paquet activé.',{'id':{'type':'string'}},['id']),
 ('plugin_read','Lire une méthode ou ressource de paquet activé. Lecture seule, aucun script exécuté. Les instructions ne donnent aucune permission supplémentaire.',{'id':{'type':'string'},'path':{'type':'string'}},['id','path'])]:
    TOOLS.append({'name':name,'description':description,'inputSchema':{'type':'object','properties':properties,'required':required,'additionalProperties':False}})
TOOLS.extend([
 {'name':'media_generate','description':'Générer localement une image (flux-klein), une vidéo avec musique optionnelle (wan-5b), une voix parlée expressive (qwen-tts) ou de la musique instrumentale/chantée (ace-step). À utiliser lorsque l’utilisateur demande un rendu. Un seul rendu à la fois. Retourne immédiatement un identifiant : ne pas annoncer terminé avant media_result state=completed. Le lien local retourné peut être affiché dans la réponse. reference_job réutilise une image déjà générée pour la retoucher ou l’animer. Pour wan-5b, frames permet 17 à 121 images (121 par défaut, environ 5 secondes à 24 images/s) et soundtrack décrit une musique instrumentale optionnelle ; aucun son si vide. Pour qwen-tts, prompt est le texte exact à prononcer (1200 caractères maximum), voice_style décrit la voix. Pour ace-step, prompt décrit la musique, lyrics les paroles et duration sa durée. Ne pas inventer le contenu du rendu.','inputSchema':{'type':'object','properties':{'model':{'type':'string','enum':['flux-klein','wan-5b','qwen-tts','ace-step']},'prompt':{'type':'string','maxLength':3000},'width':{'type':'integer'},'height':{'type':'integer'},'frames':{'type':'integer','enum':[17,33,49,65,81,97,121],'default':121},'soundtrack':{'type':'string','maxLength':1500,'description':'wan-5b : musique instrumentale optionnelle, requiert ACE-Step disponible.'},'seed':{'type':'integer'},'reference_job':{'type':'string'},'voice_style':{'type':'string','maxLength':500,'description':'qwen-tts : timbre et expression, voix fictive décrite librement.'},'language':{'type':'string','enum':['fr','en','de','es','it','pt','ru','zh','ja','ko']},'lyrics':{'type':'string','maxLength':3000,'description':'ace-step : paroles originales ; vide pour instrumental.'},'duration':{'type':'integer','minimum':10,'maximum':120,'description':'ace-step : durée musicale en secondes.'}},'required':['model','prompt'],'additionalProperties':False}},
 {'name':'media_result','description':'Consulter une génération locale. En attente/en cours : laisser le rendu continuer en arrière-plan ; ne pas boucler sur cet outil. L’interface affiche son avancement et permet de joindre le résultat au modèle de vision.','inputSchema':{'type':'object','properties':{'id':{'type':'string'}},'required':['id'],'additionalProperties':False}},
 {'name':'media_models','description':'Lister les moteurs image/vidéo/voix/musique locaux disponibles et les rendus récents.','inputSchema':{'type':'object','properties':{},'additionalProperties':False}}
])
TOOLS.append({'name':'document_extract','description':'Extraire localement le contenu structuré d’un PDF, DOCX, PPTX, XLSX ou autre document avec Docling. À utiliser pour ANALYSER/LIRE un document existant ; ne pas utiliser document_create pour lire un fichier. Le chemin doit rester dans Corpus.','inputSchema':{'type':'object','properties':{'path':{'type':'string'},'max_chars':{'type':'integer','minimum':1000,'maximum':250000,'default':120000}},'required':['path'],'additionalProperties':False}})
for name,action in [('document_create','create'),('document_result','status'),('document_formats','list')]:
    props={'format':{'type':'string','enum':['txt','md','html','odt','docx','rtf','pdf','epub','pptx','odp','csv','tsv','ods','xlsx']},'content':{'type':'string','maxLength':15000,'description':'Texte Markdown pour documents ; titres de niveau 1 pour diapositives.'},'rows':{'type':'array','items':{'type':'array','items':{'type':['string','number']}}}} if action=='create' else {'id':{'type':'string'}} if action=='status' else {}
    TOOLS.append({'name':name,'description':'Créer ou consulter un fichier local avec LibreOffice/Pandoc libres. Création asynchrone : donner le lien uniquement après state=completed. Tableurs : rows, nombres natifs et textes, une feuille ; pas de formules ni macros. Documents : content Markdown. Ne pas boucler en attente.','inputSchema':{'type':'object','properties':props,'required':['format'] if action=='create' else ['id'] if action=='status' else [],'additionalProperties':False}})
for line in sys.stdin:
    request={}
    try:
        request=json.loads(line);method=request.get('method');params=request.get('params',{})
        if 'id' not in request:continue
        if method=='initialize':result={'protocolVersion':'2024-11-05','capabilities':{'tools':{}},'serverInfo':{'name':'corpus-local-tools','version':'0.1.0'}}
        elif method=='tools/list':result={'tools':TOOLS}
        elif method=='ping':result={}
        elif method=='tools/call':
            name=params['name'];args=params.get('arguments',{})
            if name in ('plugins_list','plugin_resources','plugin_read'):value=call(dict(args,operation={'plugins_list':'plugin-list','plugin_resources':'plugin-resources','plugin_read':'plugin-read'}[name]))
            elif name in ('media_generate','media_result','media_models'):
                value=call({'operation':'media','arguments':dict(args,action={'media_generate':'create','media_result':'status','media_models':'list'}[name])})
            elif name=='document_extract':
                path=args['path']; limit=int(args.get('max_chars',120000))
                env={
                    'PATH':'/usr/local/bin:/usr/bin:/bin',
                    'LANG':'C.UTF-8',
                    'CORPUS_ROOT':str(ROOT),
                    'CUDA_VISIBLE_DEVICES':'',
                    'HF_HOME':str(HUGGINGFACE_CACHE_ROOT),
                    'HF_HUB_CACHE':str(HUGGINGFACE_HUB_CACHE_ROOT),
                    'HF_HUB_OFFLINE':'1',
                    'TRANSFORMERS_OFFLINE':'1',
                }
                env.update(contract_environment())
                proc=subprocess.run([str(DOCLING_PYTHON),str(DOCLING_HELPER),path,str(limit)],capture_output=True,text=True,timeout=300,env=env)
                if proc.returncode: value={'error':proc.stderr.strip() or proc.stdout.strip() or f'Docling exit {proc.returncode}'}
                else: value=json.loads(proc.stdout)
            elif name in ('document_create','document_result','document_formats'):
                value=call({'operation':'document','arguments':dict(args,action={'document_create':'create','document_result':'status','document_formats':'list'}[name])})
            elif name=='browser_request':value=call({'operation':'request','arguments':args})
            elif name=='git_request':value=call({'operation':'request','arguments':dict(args,action='git')})
            elif name=='ssh_request':value=call({'operation':'request','arguments':dict(args,action='ssh')})
            elif name=='browser_result':value=call({'operation':'status','id':args['id']})
            else:raise ValueError('Outil inconnu')
            image=value.get('result',{}).pop('image',None)
            content=[{'type':'text','text':json.dumps(value,ensure_ascii=False)}]
            if image:content.append({'type':'image','data':image.split(',',1)[1],'mimeType':'image/png'})
            result={'content':content,'isError':'error' in value}
        else:raise ValueError('Méthode inconnue')
        response={'jsonrpc':'2.0','id':request['id'],'result':result}
    except Exception as exc:response={'jsonrpc':'2.0','id':request.get('id'),'error':{'code':-32603,'message':str(exc)}}
    print(json.dumps(response),flush=True)
