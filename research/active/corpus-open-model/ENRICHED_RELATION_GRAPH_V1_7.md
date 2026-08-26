# Graphe relationnel enrichi v1.7

Le graphe v1.7 n’infère aucune relation à partir de similarité ou d’un modèle.
Il ajoute seulement des arêtes `references_explicitly` lorsque le fichier source
porte soit un lien Markdown relatif résoluble, soit un chemin de fichier entre
backticks résoluble. Chaque arête conserve son canal et son fichier source.

Cette extraction augmente la matière observable ; elle ne transforme jamais
une référence en dépendance, une preuve, une règle active ou une relation
sémantique. Les URL externes, chemins absents et analogies sont exclus.

```bash
python research/active/corpus-open-model/src/inspect_enriched_relation_graph.py
```

Le graphe sera audité avant toute nouvelle tâche d’apprentissage.
