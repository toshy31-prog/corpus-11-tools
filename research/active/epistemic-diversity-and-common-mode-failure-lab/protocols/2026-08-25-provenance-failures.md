# Protocole fixé avant exécution — provenance et pannes communes

## Portée et générateur

`model_internal`. Quatre voies fictives déclarent sources, générateur, code,
hypothèses, mesure et conclusion dans `tests/test_provenance_failures.py`.

## Paramètres, invariants et contrôles

A et B ont des sources distinctes mais partagent `generator:g-shared` et
`assumption:h-shared`. C et D ont la même conclusion sans dépendance commune.
Chaque panne cible un identifiant de provenance. Les quatre voies doivent être
affectées à exactement trois grappes.

## Effet et retrait

La panne est injectée par le modèle et ne mesure aucune indépendance extérieure.
Le contrôle source-only doit manquer A–B. Retirer le verdict si le lignage
change, si une dépendance reste inconnue ou si une panne annoncée n’atteint pas
toutes les voies qui la déclarent.
