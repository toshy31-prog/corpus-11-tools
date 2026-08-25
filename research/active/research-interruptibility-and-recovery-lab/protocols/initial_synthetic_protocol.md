# Reprise synthétique depuis état gelé

## Construit et portée

Le protocole vérifie qu’un état de recherche explicitement sérialisé conserve
identifiant, décision, artefacts et voie de recours à travers une interruption
simulée. C’est une vérification de pipeline, non une démonstration de reprise
dans tous les environnements.

## Invariants et retrait

La restauration doit égaler l’état gelé sur les champs matériels ; le journal
d’interruption et la possibilité d’annuler restent présents. Réviser le
protocole si une interruption réelle révèle des dépendances non sérialisées.
