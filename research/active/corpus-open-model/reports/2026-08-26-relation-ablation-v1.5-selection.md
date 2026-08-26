# Sélection locale — ablation relationnelle v1.5

## Branches préenregistrées

Les deux branches ont été entraînées 1 000 pas sur les mêmes 635 documents
train, avec la même initialisation déclarée et la même partition. La sélection
utilise exclusivement les cinq documents relationnels de validation.

| Branche | Meilleure étape | Perte MLM validation relationnelle |
| --- | ---: | ---: |
| `declared` | 1000 | 8,2365 |
| `ablated` | 1000 | **8,1918** |

La branche `ablated` est figée pour sélection ; l’écart est `0,0448` en faveur
de l’ablation.

## Conclusion bornée

Dans cette fenêtre de cinq documents relationnels, le signal de compteur de
relations déclarées ne présente pas de bénéfice de validation observable. Cela
ne démontre ni que les relations sont inutiles, ni que le modèle ne les traite
pas : l’échantillon est très petit et tous les documents relationnels restent
des documents produit.

Les deux checkpoints étaient préenregistrés. Le test v1.5 est donc autorisé
une seule fois pour les deux branches sur les mêmes 77 documents, avec métriques
séparées pour les cinq documents relationnels et les 72 autres. Il ne pourra
pas régler la suite de v1.5.

## Après ouverture unique du test

Le [test observé](2026-08-26-relation-ablation-v1.5-test.md) conserve le même
sens : `ablated` est légèrement meilleur dans les trois strates. v1.5 est donc
clos et ne doit pas être ajusté à partir de ces résultats.
