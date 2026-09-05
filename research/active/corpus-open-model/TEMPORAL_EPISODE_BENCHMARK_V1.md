# Benchmark temporel d'épisodes v1

## Question

Une mémoire apprise de l'évolution réelle de Corpus prédit-elle le **prochain
type structurel de changement** mieux qu'une règle de persistance/fréquence ?

La question est volontairement étroite. Un succès éventuel établirait une
capacité prédictive locale sur des transitions structurelles ; il
n'établirait ni compréhension des textes, ni autonomie, ni émergence.

## Données admises

Les seuls exemples sont les lignes append-only de
`artifacts/ecosystem-episodes-v0.jsonl`, produites par
`src/ecosystem_episode_ledger.py`. Chaque ligne contient seulement chemins,
surfaces, extensions, tailles, hachages et relations explicites — jamais le
texte des fichiers.

Sont exclus les épisodes sans changement, les épisodes ne contenant que des
caches (`.pytest_cache/`), les fichiers de runtime du laboratoire et les
rendus générés du harnais de comparaison. Un épisode mixte reste admis si une
partie du changement est hors de ces zones ; la cible ne compte que cette
partie admise.

## Cible et baseline gelées

Pour chaque épisode admis, la cible est sa **signature de surfaces** : les
surfaces qui ont reçu au moins un ajout, retrait ou modification, plus un
bit indiquant un changement de relation explicite. Le futur modèle recevra
seulement les signatures antérieures ; il doit prédire la suivante.

La baseline est la signature la plus fréquente dans la partie d'entraînement,
avec départage déterministe. Elle représente le meilleur pari qui ignore la
chronologie. Le noyau ne pourra être retenu que s'il la bat sur validation,
puis sur un test chronologique jamais ouvert pendant le réglage.

## Admission et partition

- Avant **30 épisodes admis**, aucun entraînement n'est autorisé.
- À 30 épisodes, le collecteur fige dans un manifeste local les identifiants
  et la partition chronologique : 70 % entraînement, 15 % validation, 15 %
  test (au moins un épisode dans chaque partition lorsque le total le permet).
- Le test reste fermé jusqu'à une sélection explicite sur validation.
- Les épisodes ajoutés après le gel n'entrent pas dans cette première campagne.

Le seuil de 30 n'est pas une preuve statistique magique : c'est un minimum
opérationnel qui évite d'ajuster un réseau à une poignée de transitions. Si
la diversité observée est insuffisante à ce point, la campagne est déclarée
non concluante plutôt que prolongée en silence.

## Commande locale

```bash
python3 research/active/corpus-open-model/src/temporal_episode_readiness.py
```

Elle ne fait que lire le registre et afficher l'état de préparation. Elle
n'entraîne rien, ne modifie aucun fichier de produit et n'appelle aucune API.
