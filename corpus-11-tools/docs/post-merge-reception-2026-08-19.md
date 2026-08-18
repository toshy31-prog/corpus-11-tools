# Réception post-merge — 2026-08-19

## État

Validation finale en cours sur l’état post-bootstrap de `main`.

## Base vérifiée

- `main` après merge de la PR #18 : `481856d399750eec017fa61897c98524bee29176`.
- La PR d’attestation ne modifie aucun code produit ni aucune recherche ; ce document est le seul changement volontaire utilisé pour déclencher la réception finale depuis le workflow désormais présent sur `main`.
- Un événement `synchronize` est déclenché après installation effective du workflow sur `main` afin que la réception finale soit exécutée depuis la configuration pérenne, et non depuis le bootstrap temporaire.

## Condition de clôture

Ce document ne sera finalisé et mergé qu’après succès du workflow `Post-merge full validation` sur la PR d’attestation. Le résultat final doit couvrir paquet, graphe, documentation, frontières produit/recherche, tests Python, tests Node hors prototype alimentaire archivé, contrôles CCT, tests du prototype alimentaire, JSON/JSONL et intégrité whitespace.
