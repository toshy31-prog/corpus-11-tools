# Benchmark v1 — routage hors corpus historique

## Statut

Ce jeu est **gelé** le 26 août 2026 et interdit à l'entraînement, au choix des
hyperparamètres et à la sélection de vocabulaire. Il est distinct de
`routing-and-nonregression.jsonl` mais reste synthétique et rédigé au sein du
projet : il mesure une généralisation de développement, non une indépendance
humaine ou externe.

## Couverture

- paraphrases françaises sans nom de capability ;
- requêtes anglaises et espagnoles ;
- compositions de deux méthodes ;
- trois négatifs où le système doit s'abstenir ;
- une formulation hostile qui tente de détourner la tâche de préservation de la
  question.

## Règles

Le fichier `cases.jsonl` est append-only. Toute modification de prompt, label,
langue ou règle de score exige une nouvelle version de benchmark. Les résultats
de v1 ne peuvent pas servir à modifier CorpusNet-Router v0 ; une v1.1 devrait
être sélectionnée sur un jeu de validation distinct et confrontée à un nouveau
benchmark gelé.
