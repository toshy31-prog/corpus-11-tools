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
