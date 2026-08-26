# Test unique — ablation relationnelle v1.5

## Résultats observés

Les deux branches préenregistrées ont été mesurées une fois sur les mêmes 77
documents test : cinq avec relation déclarée et 72 sans relation déclarée.

| Strate | `declared` | `ablated` | Ablated − declared |
| --- | ---: | ---: | ---: |
| Tous documents | 8,1583 | **8,1499** | -0,0084 |
| Avec relation déclarée (n=5) | 8,2787 | **8,2358** | -0,0429 |
| Sans relation déclarée (n=72) | 8,1638 | **8,1581** | -0,0057 |

Une perte plus basse est meilleure. Dans ce test, la neutralisation du signal
relationnel est légèrement meilleure dans les trois lectures.

## Conclusion bornée

Le compteur de degré de relations déclarées utilisé en v1.5 ne démontre aucun
gain MLM détectable sur cette architecture, cette graine, cette partition et ce
corpus. Il ne doit donc pas être conservé comme composant sélectionné sur la
base de cette expérience.

Ce résultat ne démontre pas que les relations Corpus sont inutiles ou
incompréhensibles par un modèle. Cinq documents relationnels de test, tous
produit, ne permettent ni intervalle d’incertitude utile ni séparation entre
effet des relations, contenu des documents et surface produit. Il s’agit d’un
résultat négatif local sur **ce codage scalaire du degré**, pas sur la notion de
relation elle-même.

## État

Le test v1.5 est observé et ne doit plus servir à régler l’architecture, les
pas, la graine ou le codage relationnel de v1.5. Aucun déploiement ni transfert
vers le produit n’est autorisé par ce rapport.
