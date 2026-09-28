# Corpus GPT --- opérations et reprise

## Si tu es une nouvelle IA

1.  Appelle `Corpus.status`.
2.  Si l'outil n'existe pas, indique que le plugin/tunnel n'est pas
    disponible dans cette session ; ne prétends pas avoir accès au PC.
3.  Si `status` passe, appelle `Corpus.doctor`.
4.  Appelle `Corpus.jobs` avant toute exécution.
5.  Utilise `Corpus.latest_evidence` pour les preuves.
6.  Exécute seulement un job listé et pertinent.
7.  Si l'action nécessaire n'existe pas encore, préfère
    `Corpus.install_managed_job` pour installer un job Bash borné plutôt
    qu'un accès shell ou une écriture directe dans le registre.

## Si le tunnel semble indisponible

Couches à distinguer : - plugin ChatGPT ; - association Secure MCP
Tunnel ; - `corpus-gpt-tunnel.service` ; - clé runtime ; -
`tunnel-client` ; - MCP stdio ; - `corpus-gpt` ; - runner ; -
CDP/Firefox/Corpus.

Ne pas réparer plusieurs couches à la fois sans diagnostic.

## État de référence

État sain attendu :

``` text
CORPUS=PASS
CDP=PASS
FIREFOX=PASS
RUNNER_LOCK=FREE
CORPUS_GPT_DOCTOR=PASS
```

Le tunnel sain doit pouvoir récupérer ses métadonnées et démarrer le
control-plane poller sans `401 invalid_api_key`.

## Architecture de transport finale validée le 2026-09-27

Pour les jobs lancés depuis ChatGPT via le plugin MCP `Corpus`, le résultat du
runner revient déjà dans la réponse MCP. Le MCP transmet donc
`CORPUS_BB_SKIP_GPT=1` au processus enfant : le runner affiche
`GPT_REPORT_SEND=SKIPPED` et ne tente pas de réémettre le même rapport par le
transport navigateur historique.

Chaîne validée :

```text
ChatGPT
  → plugin Corpus
  → Secure MCP Tunnel
  → corpus_gpt_mcp.py
  → corpus-gpt / Runner V3
  → job / CDP / preuves
  → résultat MCP
  → ChatGPT
```

Les transports historiques `corpus-bb-send-text` et `corpus-bb-send-shot`
restent des capacités explicites séparées. Ils ne doivent pas être déclenchés
automatiquement après un job MCP.

### Cycle de vie important

`corpus-local.service` et `corpus-gpt-tunnel.service` sont indépendants.
`corpus_gpt_mcp.py` est lancé par `tunnel-client`. Après modification de ce
fichier, il faut donc redémarrer `corpus-gpt-tunnel.service` pour charger le
nouveau code. Redémarrer seulement `corpus-local.service` ne suffit pas.

Validation observée après redémarrage du tunnel :

```text
CORPUS_REPO_LOG=PASS
GPT_REPORT_SEND=SKIPPED
JOB_EXIT_CODE=0
EXIT_CODE=0
```

## Reprise intelligente après tout blocage

Ordre générique :

1. préserver le HEAD, le working tree et la dernière preuve valide ;
2. classifier le blocage ;
3. inspecter l'état réel avant retry ;
4. réduire au contrôle minimal ;
5. réparer la cause racine avec une action réversible et bornée ;
6. valider ciblé puis global ;
7. reprendre à l'étape vérifiée suivante ;
8. si le cas s'est déjà produit, automatiser définitivement sa résolution.

Cas transport ou timeout : consulter status/runtime_probe, le verrou runner et les
runs existants avant tout rerun. Cas pression disque : mesurer les octets réellement
nécessaires et classifier les chemins selon CORPUS_LIFECYCLE.json avant toute
proposition de nettoyage. Cas attestation stale : comparer le HEAD, le working tree
et l'historique ; ne régénérer l'attestation qu'après revue du changement source.
Cas permission : conserver le refus et ne pas changer de canal pour le contourner.

### Commandes et outils associés

- assess_blocker pour classifier l'obstacle ;
- start_job pour un job long ;
- async_jobs pour retrouver un lancement existant ;
- job_status pour récupérer sa fin et son résultat ;
- python3 scripts/corpus storage --json pour une pression disque ;
- python3 scripts/corpus blocker - pour le même classifieur depuis le control plane.

Ne pas boucler rapidement sur job_status : lancer une fois, poursuivre le travail
indépendant possible, puis relire l'état lorsque le résultat devient nécessaire.

### Rechargement automatique des sources MCP

Le watcher utilisateur corpus-gpt-source-watch.path surveille les quatre sources
qui déterminent la couche MCP. corpus-gpt-source-reload.service appelle le garde
de hash corpus_gpt_reload.py : si le contenu est inchangé, aucun restart ; si le
contenu a changé, le tunnel est redémarré et le hash n'est enregistré qu'après
succès.

État du watcher :
systemctl --user is-active corpus-gpt-source-watch.path
systemctl --user is-enabled corpus-gpt-source-watch.path

## Ordre de décision efficace

Le fast path reste prioritaire. plan_next n’est pas un préflight obligatoire : l’utiliser seulement lorsque la route, la portée, les modalités, la réversibilité ou un blocage nécessitent un arbitrage. Si le job connu est local, court et sain, l’exécuter directement.

1. status, une seule fois.
2. Si sain et job connu : exécution directe ; pas de doctor/jobs redondants.
3. Si job inconnu : jobs.
4. Si infrastructure dégradée : doctor.
5. Si durée potentiellement longue : start_job puis job_status.
6. Si timeout : récupérer l'état existant ; ne pas dupliquer.
7. Pour un job local géré : aucun préflight CDP.
8. Pour navigation/DOM/screenshot : déclarer corpus-job-kind: browser.
9. Préférer résumé/delta/hash/compteurs avant dump intégral.

## Modalités de travail et coût caché

Le planner ne confond pas capacité disponible et capacité à initialiser. Il active
la modalité minimale nécessaire :

- local_compute : jobs, code, Git, fichiers, tests et diagnostics locaux ; CDP est sauté.
- browser_interaction : navigation et interaction browser ; CDP reste requis.
- visual_evidence : screenshot/frame demandé comme preuve, sans être ajouté aux tâches qui n'en ont pas besoin.
- outbound_transport : envoi historique texte/capture vers ChatGPT comme étape explicite, jamais comme effet implicite de chaque job.

La surface browser vérifiée conserve launch/close, navigate, click, fill, pointer,
type, key, scroll, back/forward/reload, snapshot, screenshot/frame, onglets
new/select/close, zoom, viewport desktop/mobile, PDF, historique et téléchargements.

Le terminal reste une capacité d'exécution bornée par jobs ; le plugin ne
transforme pas l'optimisation en shell graphique arbitraire. Une session UI/UX
peut donc conserver navigateur, clics, saisie, viewport et captures, tandis
qu'une session de code pure ne paie pas leur coût d'initialisation.

Cette séparation reprend les invariants du tool router : exposition minimale,
fail-closed, respect des outils explicitement requis, fallback seulement lorsque
le signal direct ne suffit pas, et trace de la décision.

## Invariants réemployés des routeurs Corpus

- Stage direct avant fallback : un signal explicite suffit ; ne pas appeler un routeur sémantique pour redécouvrir ce qui est déjà connu.
- Contraintes négatives avant exposition : une interdiction retire une capacité candidate au lieu d'être noyée dans un score.
- Contexte hérité avec parcimonie : réutiliser le contexte de sous-tâche pertinent sans relire tout l'historique.
- Budget explicite : ne pas supposer qu'un chemin plus coûteux, un modèle plus lourd ou davantage de preuves est meilleur.
- Fail-closed : une erreur de routing n'élargit jamais les capacités.
- Séparer chemin structurel et preuve contextuelle : la raison d'une route reste inspectable sans être confondue avec l'action elle-même.
- Une capacité explicitement demandée n'est pas retirée par l'optimisation ; elle est bornée et son coût devient visible.

## Contexte, délégation et preuves — invariants réemployés

- Admission, permission et exécution sont trois états distincts. Un plan admissible ne crée aucune permission et ne lance rien.
- Une délégation ne peut jamais élargir les outils/permissions exposés au parent. Temps, appels d'outils, parallélisme, profondeur et risque restent bornés.
- Le contexte stable et le contexte variable restent séparés. Une identité de cache inclut modèle, profil d'outils, permissions et empreinte du contexte invariant ; les tours utilisateur, résultats d'outils et passages récupérés restent variables.
- Une déduplication de contexte n'est sûre qu'à provenance et permission identiques. L'égalité textuelle ne permet pas de franchir une frontière d'accès.
- Un cache hit ne doit pas consommer un budget de requête externe. Une source absente ou limitée doit produire un frontier/stop reason, pas une boucle.
- Cohérence inter-preuves ne signifie ni vérité ni succès. Un paquet cohérent reste non promu tant que sa vérification propre n'est pas satisfaite.
- Les receipts et checkpoints doivent transporter métadonnées, hashes, limites et raisons ; éviter de recopier les contenus lourds lorsqu'ils sont déjà attestés.


### Écriture bornée du dépôt

`write_repo_file` permet une écriture texte atomique strictement confinée au dépôt Corpus. Elle refuse les chemins absolus et traversal ; `require_clean` peut imposer un working tree propre. Elle ne remplace ni les validations métier ni les jobs d’exécution.

### Capability handoff
Une évolution de surface MCP suit source → validation → reload demandé → loaded confirmé → vérification en session fraîche. Un digest observé ne devient jamais loaded_digest par observation. Si le schéma client reste ancien : receipt → NEW_CHAT_REQUIRED → nouvelle conversation → resume_handoff → vérification → reprise.

### Trois frontières de refresh
Un changement de surface distingue runtime reload, redécouverte du plugin/outillage côté client et schéma conservé par la conversation. Un runtime chargé peut donc encore exiger PLUGIN_REFRESH_REQUIRED=true puis NEW_CHAT_REQUIRED=true. Ne jamais assimiler ces états.

### Continuation après checkpoint
Un handoff borné est un point de reprise persistant, pas une obligation de changer de conversation. Continuer dans le chat courant si contexte/stream, surface MCP et runtime sont sains. Ne demander reload/refresh/nouveau chat que lorsque les indicateurs du receipt l'exigent et avec new_chat_reason explicite. À la reprise, consommer exact_jobs, async_tokens, baselines et stop_conditions avant toute redécouverte.
