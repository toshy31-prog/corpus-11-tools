# Porte d’entrée des cas de perte relationnelle

## Construit et portée

Ce protocole historique vérifie seulement que le dossier refuse de promouvoir
un fixture incomplet. Sa portée est `pipeline_verified` et il est distinct du
nouveau test de graphes fictifs appariés.

## Définition opérationnelle

Le fixture est un cas d’entraînement incomplet. La porte doit le rejeter même
s’il décrit une perte plausible. La conclusion ne porte que sur le pipeline.

## Invariants et retrait

- aucune donnée personnelle ni témoignage ;
- aucune qualification externe ;
- présence de l’objet, accès antérieur, rupture actuelle, contrôle comparable
  et base de collecte sont tous requis.

Réviser la porte si un monde fictif apparié révèle une condition manquante ou
inutile ; ne pas utiliser cette porte comme preuve de perte relationnelle.
