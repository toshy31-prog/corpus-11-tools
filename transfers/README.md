# Registre de transfert recherche → Corpus

Ce sas empêche qu’un résultat local devienne silencieusement une capacité du produit.

## États

- `candidates/` : mécanismes proposés mais pas encore indépendants de leur recherche source ;
- `accepted/` : mécanismes décontextualisés, testés et intégrés à Corpus ;
- `rejected/` : propositions refusées ou abandonnées, avec leur raison.

Chaque transfert doit identifier la recherche source, le mécanisme extrait, ce qui a été retiré du contexte, les tests propres à Corpus, les dépendances restantes et la condition de retrait.

La direction autorisée est :

```text
recherche → proposition → transfert contrôlé → outil Corpus
```

Une recherche peut importer un outil Corpus. Un outil Corpus ne peut pas importer les paramètres, résultats ou conclusions d’une recherche.
