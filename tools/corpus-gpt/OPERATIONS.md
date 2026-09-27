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
