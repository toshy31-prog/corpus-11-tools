# Protocole synthétique initial — Corpus Open Model

## Question

Un noyau neuronal local peut-il apprendre un routage de capabilities Corpus,
dont la portée et les sources restent contrôlables sans LLM ?

## Matériaux

- `corpus-11-tools/docs/inventory.json` est la liste autoritative des skills
  déclarés par le produit observé ;
- les chemins sous `corpus-11-tools/`, `research/`, `transfers/` et les fichiers
  racine définissent les carriers à indexer ;
- les fichiers `.git`, dépendances, environnements virtuels et artefacts
  générés sont exclus.

## Procédure

1. Construire deux snapshots du même arbre et vérifier l'égalité de leurs
   empreintes.
2. Vérifier que les carriers produit, recherche et transfert restent distincts.
3. Entraîner CorpusNet-Router v0 sur `train` seulement ; garder les prompts
   `validation` et `test` hors entraînement. Comparer le réseau à une baseline
   lexicale sur `test`, sans choisir un vainqueur automatique.
4. Compiler le graphe et vérifier que produit, recherche, archives et
   transferts conservent chacun un statut distinct.
4. Vérifier qu'une capability non déclarée n'est jamais fabriquée.

## Résultat interprétable

Un succès établit seulement une propriété du pipeline local : les métadonnées,
l'apprentissage et le routage respectent ce protocole. Il n'établit pas que le
modèle comprend les documents, qu'il est robuste à toutes formulations, ni
qu'il est préférable à un LLM.

## Renversement

Le programme initial est mis en échec si un même état donne deux empreintes,
si les carriers se mélangent, si un prompt test entre dans l'entraînement, ou
si le routeur invente/exécute une capability hors inventaire.
