# Ouverture unique du test — EcologicalTinyEncoder v1.4

## Changement observé

La variante v1.4 remplace le flux textuel continu de v1.3 par des séquences
bornées à un document, accompagnées d’embeddings distincts pour le statut
déclaré et le nombre borné de relations déclarées. Elle contient `17 043 456`
paramètres et a été entraînée localement sur la RTX 4070 Laptop, sans API ni
poids externes.

## Sélection préalable

Le run préenregistré de 1 000 pas avec validation tous les 200 pas a produit :

| Pas | Perte MLM validation |
| ---: | ---: |
| 200 | 8,8066 |
| 400 | 8,3151 |
| 600 | 8,3390 |
| 800 | **8,2143** |
| 1000 | 8,5414 |

Le checkpoint `ecological-tiny-encoder-v1.4-best.pt` au pas 800 est le seul
checkpoint sélectionné. Cette décision n’a pas consulté le test v1.4.

## Indépendance du test

Le test v1.4 contient 90 documents et 221 560 tokens. Les 78 documents et
98 407 tokens du test v1.3 déjà observé ont été exclus de l’entraînement, de
la validation et du test v1.4. Les partitions v1.4 sont déterminées à partir
de `sha256('tiny-doctrine-ecological-v1.4:' + path)`.

## Ouverture observée

`evaluate_ecological_tiny_test.py` a été exécuté une fois sur le checkpoint du
pas 800. La perte MLM test observée est `8,4223`. L’artefact de résultat rend
le test fermé : il ne peut plus servir à régler v1.4.

## Limite et suite

La mesure compare des prédictions de tokens dans une partition propre, pas la
compréhension des relations, une capacité de raisonnement, la mémoire,
l’identité, l’autonomie ou une émergence. Les valeurs v1.3 et v1.4 proviennent
de partitions différentes : elles ne permettent donc pas de conclure à une
amélioration chiffrée directe entre architectures.

Le test contient `0` document porteur de relation déclarée. Il contrôle donc
la généralisation MLM de la v1.4, mais il ne teste pas l’effet du signal de
relations sur des documents qui en possèdent. Toute attribution d’un gain ou
d’une absence de gain à cette composante serait non identifiée.
