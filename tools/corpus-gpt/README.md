# Corpus GPT --- documentation canonique

## Pour une IA qui découvre Corpus sans historique

Corpus GPT est le pont borné entre ChatGPT et l'environnement local
Corpus d'Olivier.

RÈGLE PRIORITAIRE : si le plugin MCP `Corpus` est disponible, ne demande
pas d'abord à Olivier de copier-coller des commandes dans son terminal.
Commence par `status` une seule fois. Si l'état est sain et le job exact
est déjà connu, utilise directement `run_job` ou `start_job` selon le cas.
Utilise `job_info`/`jobs` seulement pour une découverte nécessaire et
`doctor` seulement si l'infrastructure est dégradée ou insuffisamment
établie. `plan_next` reste réservé à un arbitrage réel et n'autorise aucune
action. Corpus GPT n'est pas un shell arbitraire.

## La boucle complète

ChatGPT dispose maintenant d'un plugin MCP nommé `Corpus`.

``` text
ChatGPT
  ↓ plugin MCP Corpus
Secure MCP Tunnel OpenAI
  ↓
tunnel-client local
  ↓ stdio
corpus_gpt_mcp.py
  ↓
corpus-gpt
  ↓
Runner V3
  ├─ jobs/terminal/diagnostics
  └─ CDP + navigateur + DOM/ARIA
         ↓
      Corpus local
         ↓
texte / rapports / screenshots / preuves
         ↓
transport et/ou retour MCP vers ChatGPT
         ↺
```

Historiquement, la voie machine → ChatGPT avait été automatisée avant la
voie entrante. Olivier restait le relais manuel pour copier les
commandes ChatGPT vers son terminal. Le Secure MCP Tunnel ferme cette
partie de la boucle pour les capacités explicitement exposées.

## Trois capacités complémentaires

### 1. MCP entrant ChatGPT → machine

Outils actuellement exposés :

-   `status` : état backend Corpus, CDP, Firefox et verrou runner.
-   `doctor` : diagnostic Corpus GPT sans job de test.
-   `jobs` : liste des jobs enregistrés.
-   `run_job(job)` : exécute uniquement un job enregistré ; aucun chemin
    ou shell arbitraire.
-   `latest_evidence` : liste les dernières preuves BugBounty.
-   `runtime_probe` : diagnostic lecture seule du processus MCP.
-   `install_managed_job(name, content)` : installe ou met à jour un job
    Bash borné dans le registre géré ; nom strict, destination imposée,
    sauvegarde de l'ancienne version et validation `bash -n`.

Cette voie a été validée depuis une conversation ChatGPT réelle, sans
relais terminal humain :

``` text
CORPUS=PASS
CDP=PASS
FIREFOX=PASS
RUNNER_LOCK=FREE
CORPUS_GPT_DOCTOR=PASS
```

Jobs visibles lors de cette validation :

``` text
bb07-discover
bb07-revision-inspect
bb07
bb08
quick-access-inspect
runner-core-selftest
runner-selftest
runner-v3-selftest
```

### 2. Automatisation locale navigateur + terminal

Le runner sait exécuter des workflows pré-enregistrés avec verrou
exclusif, préflight, CDP, inspection DOM/ARIA, navigation, captures,
hashes et rapports.

Le préflight CDP a validé notamment :

``` text
CORPUS_TAB_DEDUP=PASS
CDP_TAB_INVARIANT=PASS
CDP_AUTOHEAL=PASS
BB_CDP_PREFLIGHT=PASS
```

La navigation automatique sait notamment : - retrouver l'unique page
Corpus ; - ouvrir `Accès rapide Corpus` ; - sélectionner une
conversation ; - ouvrir `Modifications du projet` / la révision ; -
identifier les fichiers par DOM/ARIA ; - utiliser `Fichier précédent` /
`Fichier suivant` ; - cliquer `Actualiser la révision` ; - observer et
comparer l'état avant/après ; - prendre des screenshots et produire des
preuves.

BB-07 a validé :

``` text
ephemeral-exploration.mjs
  → Fichier précédent
catalogue-graph.mjs
  → Fichier précédent
README.md

BB07_SEQUENCE=ephemeral->catalogue-graph->README
BB07_NAVIGATION_PREVIOUS=PASS
UNIQUE_SCREENSHOTS=3
```

BB-08 a validé la conservation de sélection lors du refresh :

``` text
BB08_SELECTION_PRESERVED=projets/youtube-scout/lib/catalogue-graph.mjs
BB08_NAV_STATE_PRESERVED=PASS
BB08_URL_PRESERVED=PASS
BB08_REFRESH_SELECTION=PASS
```

### 3. Transport sortant historique machine → ChatGPT

Le système sait sélectionner une conversation ChatGPT gérée, joindre
exactement une capture, attendre que la pièce jointe soit prête,
envoyer, attendre que la réponse soit terminée puis envoyer la suivante.

Marqueurs validés :

``` text
WEBDRIVER_FRESH_SESSION=PASS
CHAT_SELECTION=UNIQUE_MANAGED
FILE_INPUT_SELECTION=EXACT_IMAGE
UPLOAD_COMMAND=PASS
ATTACHMENT_READY=PASS
SEND_CLICK=PASS
CHAT_IDLE=PASS
CHATGPT_DOM_TRANSPORT=PASS
CORPUS_BB_SEND_SHOT=PASS
```

Le transport texte a aussi passé son self-test :

``` text
CORPUS_BB_TEXT_TRANSPORT_SELFTEST=PASS
TYPE=transport-only
CORPUS_MODIFIED=NO
```

## Secure MCP Tunnel et plugin

Plugin ChatGPT : `Corpus`

Tunnel :

``` text
tunnel_6ab956b7bd2481919646752e10115b59
```

Nom Platform observé : `Corpus GPT Local`.

Description :
`Accès privé et borné à Corpus local : état, diagnostics, jobs enregistrés et preuves.`

Authentification du plugin : `Sans authentification`. Le transport du
tunnel, lui, utilise une clé runtime dédiée stockée localement. Cette
clé ne doit jamais être documentée ni committée.

La clé runtime a été créée avec le minimum observé nécessaire :
permission `Tunnels: Read + Use`, autres permissions à `None`.

Le tunnel a finalement validé :

``` text
tunnel metadata fetched
🟢 tunnel-client started
```

## Chemins essentiels

``` text
Dépôt
/home/olivier/Documents/ChatGPT/Corpus

MCP
/home/olivier/Documents/ChatGPT/Corpus/projets/corpus-local-llm-migration/corpus_gpt_mcp.py

Entrypoint
/home/olivier/.local/bin/corpus-gpt

Runner
/home/olivier/.local/share/corpus-bb-runner

Jobs
/home/olivier/.local/share/corpus-bb-runner/jobs

Runs
/home/olivier/.local/share/corpus-bb-runner/runs

Lock
/home/olivier/.local/share/corpus-bb-runner/state/runner-v2.lock

Documentation/freeze
/home/olivier/Documents/ChatGPT/Corpus/tools/corpus-gpt

Profil tunnel-client
/home/olivier/.config/tunnel-client/corpus-gpt.yaml

Secret runtime — NE JAMAIS DOCUMENTER LA VALEUR
/home/olivier/.config/corpus-gpt-tunnel/runtime.env

Service tunnel
/home/olivier/.config/systemd/user/corpus-gpt-tunnel.service

Preuves screenshots
/home/olivier/Images/Corpus-BugBounty/
```

## Services et ports observés

``` text
Corpus local : http://127.0.0.1:18743/corpus/index.html
OpenCode      : 127.0.0.1:18744
CDP           : 127.0.0.1:9223
Tunnel health : 127.0.0.1:8080
```

Services : - `corpus-local.service` - `corpus-gpt-tunnel.service`

Le tunnel expose localement `/healthz`, `/readyz`, `/ui` et `/metrics`.
`healthz=live` et `readyz=ready` ont été observés.

## Piège critique : HOME sandboxé OpenCode

OpenCode utilise :

``` text
/home/olivier/.cache/corpus/profiles/opencode-home
```

Cela a produit de faux chemins vers `.local/bin/corpus-gpt` et
`.local/share/corpus-bb-runner`.

Correction finale : 1. `corpus_gpt_mcp.py` s'auto-localise depuis son
propre `__file__` pour retrouver `/home/olivier`. 2. Il transmet
explicitement les chemins résolus à son processus enfant. 3.
`corpus_local.py` ne doit pas réinjecter des chemins calculés avec un
`Path.home()` déjà sandboxé.

Calcul validé :

``` text
MCP=/home/olivier/Documents/ChatGPT/Corpus/projets/corpus-local-llm-migration/corpus_gpt_mcp.py
REAL_HOME=/home/olivier
ENTRY=/home/olivier/.local/bin/corpus-gpt
```

## Runner V3

Le runner fournit un verrou exclusif, un RUN_ID, un RUN_DIR, `meta.txt`,
`stdout.log`, `stderr.log`, éventuellement `report.txt`, et un code de
sortie.

Self-test validé :

``` text
RUNNER_V3_JOB_STARTED=YES
VALUE=42
RUNNER_V3_JOB=PASS
RUNNER_SELFTEST=PASS
LOCK_AFTER_SELFTEST=FREE
```

## Incidents à connaître

### Port 8080

Après démarrage du service, un second `doctor` a signalé que 8080 était
occupé. Le propriétaire était le `tunnel-client` déjà actif : ce n'était
pas un conflit externe. Ne pas tuer le service pour cette seule raison.

### Clé API

Une première clé a provoqué `401 Unauthorized / invalid_api_key`. Après
remplacement local de la clé et redémarrage, le nouveau processus a
récupéré les métadonnées du tunnel et a démarré correctement. Ne jamais
stocker la clé dans Git.

## Contrat pour les futures IA

1.  Préférer le plugin `Corpus` au copier-coller terminal.
2.  Appeler `status` une fois ; job exact connu et état sain → direct ; découverte → `job_info`/`jobs` ; état dégradé → `doctor` ; arbitrage réel → `plan_next`.
3.  Ne jamais inventer un job.
4.  Ne jamais considérer `run_job` comme un shell.
5.  Utiliser `latest_evidence` pour les preuves.
6.  Garder distincts : tunnel/MCP, runner, navigation CDP/DOM, transport
    ChatGPT.
7.  Ne jamais exposer de secret.
8.  Pour une nouvelle capacité, préférer `install_managed_job` afin de
    créer un job borné, auditable et testable plutôt qu'un contournement
    du registre.
9.  Ne pas extrapoler : les capacités documentées sont celles
    observées/validées.
10. Le but de l'architecture est une boucle GPT ↔ machine autonome mais
    contrôlée, pas l'accès arbitraire à la machine.

## Reprise des blocages et jobs longs

Le MCP expose aussi :

- assess_blocker : classifie un blocage observé sans effet de bord ;
- start_job : démarre un job enregistré sans attendre sa fin ;
- async_jobs : retrouve les derniers jobs asynchrones et leurs tokens ;
- job_status : lit l'état persistant et la fin de sortie d'un job asynchrone.

Pour un job susceptible de dépasser la fenêtre du client, préférer start_job à
run_job. Ne jamais démarrer une seconde copie tant que l'état du premier run n'est
pas connu. Après coupure du tunnel, retrouver le token avec async_jobs et lire le
résultat existant avec job_status.

Le contrat transversal complet est documenté dans
projets/corpus-local-llm-migration/BLOCKER_RESILIENCE.md.

Watcher de source : corpus-gpt-source-watch.path. Les changements réels du MCP et
de ses modules de résilience déclenchent un reload protégé par hash ; les écritures
sans changement de contenu ne doivent pas provoquer de boucle de restart.

## Protocole d'efficacité V2

Le protocole historique status → doctor → jobs n'est plus une séquence obligatoire. Il reste valable en diagnostic, mais le chemin normal minimise les probes redondants.

Fast path : appeler status une fois. Si PASS et si le nom du job est déjà connu, ne pas appeler doctor ni jobs. Lancer directement le job court.

Discovery path : appeler jobs uniquement lorsque le nom autorisé n'est pas déjà connu.

Degraded path : appeler doctor seulement si status est dégradé, incohérent, ou si un job échoue pour une cause d'infrastructure.

Long-job path : utiliser start_job dès qu'une opération peut dépasser la fenêtre MCP, puis job_status. Ne pas commencer par run_job et attendre un timeout. job_status retourne une queue courte par défaut ; demander davantage seulement si nécessaire.

Managed jobs : install_managed_job classe désormais les nouveaux jobs local par défaut. Un job qui a réellement besoin du navigateur doit déclarer en commentaire corpus-job-kind: browser. Les jobs legacy sans métadonnée restent browser par prudence.

Un job local saute le préflight CDP. Cela évite démarrages Firefox/CDP, déduplication d'onglets et sorties de preuve inutiles pour Git, filesystem, documentation, tests ou diagnostics locaux.

Sorties : commencer par des résumés bornés et structurés. N'imprimer de gros arbres, logs ou fichiers que lorsqu'un premier résumé révèle une anomalie ou lorsque la tâche exige explicitement le détail.

État persistant : après timeout ou coupure, récupérer token/état/résultat existants avant toute relance. Une sortie de transport manquante n'est pas une preuve d'échec local.


### Écriture bornée du dépôt

`write_repo_file` permet une écriture texte atomique strictement confinée au dépôt Corpus. Elle refuse les chemins absolus et traversal ; `require_clean` peut imposer un working tree propre. Elle ne remplace ni les validations métier ni les jobs d’exécution.

### Reprise après changement de capacité
Après évolution du schéma MCP, un client peut conserver l'ancien tool schema malgré un runtime correctement rechargé. Ce n'est pas un échec local : créer le receipt, ouvrir une session fraîche et reprendre par resume_handoff.

### Continuation après checkpoint
Un handoff borné est un point de reprise persistant, pas une obligation de changer de conversation. Continuer dans le chat courant si contexte/stream, surface MCP et runtime sont sains. Ne demander reload/refresh/nouveau chat que lorsque les indicateurs du receipt l'exigent et avec new_chat_reason explicite. À la reprise, consommer exact_jobs, async_tokens, baselines et stop_conditions avant toute redécouverte.
