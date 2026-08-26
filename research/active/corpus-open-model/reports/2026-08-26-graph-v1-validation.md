# Sélection sur validation — GraphCorpusNet v1

## Comparaison gelée

Les trois systèmes ont été entraînés sur le partition `train` uniquement et
comparés sur les dix prompts `validation`. Ni le test historique, ni le
benchmark v1 ne sont employés dans cette sélection.

| Méthode | Recall@3 | Precision@3 |
| --- | ---: | ---: |
| Recouvrement lexical | 0,45 | 0,17 |
| CorpusNet-Router v0 | 0,00 | 0,00 |
| GraphCorpusNet v1 | 0,09 | 0,03 |

## Décision

`not_selected`. GraphCorpusNet v1 ne dépasse aucune baseline pertinente sur
validation. Il ne doit pas atteindre un benchmark v2, être réglé davantage sur
les partitions observées, ni être proposé comme composant de produit.

## Ce qui est appris

La simple propagation de 73 relations entre capabilities ne résout pas le
manque de données ou la faiblesse de l'encodeur de requêtes. La prochaine
hypothèse testable n'est donc pas « plus de couches », mais une représentation
de requêtes alimentée par exemples d'usage et cas négatifs réellement séparés.

Le résultat porte sur cette architecture, ces partitions et cette métrique ; il
ne réfute pas l'usage futur d'un graphe neuronal sous un protocole différent.
