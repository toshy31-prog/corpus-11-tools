# Test unique — triplets déclarés v1.6

## Résultat

Le checkpoint sélectionné à l’époque 60 sur validation (`BCE 0,6026`) obtient
sur le test non vu :

| Mesure | Valeur |
| --- | ---: |
| BCE | 0,8052 |
| Exactitude | 57,1 % (32/56) |
| Positifs / corruptions | 28 / 28 |

Pour des classes équilibrées, une prédiction probabiliste sans information a
une BCE de `0,6931`. La BCE observée est pire ; 32 bonnes décisions sur 56 ne
constituent pas, à cette taille, une discrimination généralisable établie.

## Conclusion bornée

`DeclaredTripleModel v1.6` est `not_selected`. Il n’est pas établi qu’il
distingue une arête déclarée d’une corruption de cible sur ce graphe hors
échantillon. Le test est observé et ne doit plus régler v1.6.

Ce résultat ne montre pas que les relations Corpus sont absentes ou inutiles.
Il montre que le graphe disponible — 256 arêtes, dont des négatifs synthétiques
et seulement 150 arêtes hors évaluations internes — ne fournit pas encore une
matière relationnelle suffisante pour cette représentation textuelle simple.
La prochaine étape valable est d’augmenter la qualité et la diversité des
relations observables (provenance, références, versions, transitions), avant
de modifier à nouveau le réseau.
