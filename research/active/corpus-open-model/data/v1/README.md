# Jeu de supervision candidat v1

## Rôle

Ce dossier fournit de nouveaux exemples d'usage pour entraîner un futur
encodeur de requêtes. Il n'est ni le corpus entier, ni une preuve de performance
réelle. Chaque exemple est synthétique, écrit dans le projet et étiqueté par une
capability Corpus déclarée.

## Contrat

- les exemples sont des candidats d'entraînement, jamais des benchmarks ;
- `scenario_family` est l'unité de partition : deux paraphrases d'une même
  famille ne doivent jamais être séparées entre train et validation/test ;
- chaque texte est comparé aux évaluations historiques et au benchmark v1 pour
  interdire toute duplication exacte ;
- un label doit appartenir à l'inventaire de release observé ;
- les labels vides ne sont autorisés que pour les cas `negative` ;
- la provenance reste `synthetic_project_authored`, donc indépendante du
  modèle entraîné mais non indépendante des auteurs du projet.

## État de diffusion

Usage local de recherche seulement. Le statut de licence de consolidation et de
redistribution reste `unknown` jusqu'à audit humain du dépôt source.
