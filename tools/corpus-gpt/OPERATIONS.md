# Corpus GPT --- opérations et reprise

## Si tu es une nouvelle IA

1.  Appelle `Corpus.status`.
2.  Si l'outil n'existe pas, indique que le plugin/tunnel n'est pas
    disponible dans cette session ; ne prétends pas avoir accès au PC.
3.  Si `status` passe, appelle `Corpus.doctor`.
4.  Appelle `Corpus.jobs` avant toute exécution.
5.  Utilise `Corpus.latest_evidence` pour les preuves.
6.  Exécute seulement un job listé et pertinent.

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
