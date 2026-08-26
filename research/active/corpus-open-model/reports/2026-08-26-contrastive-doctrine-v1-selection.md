# Sélection — ContrastiveDoctrineRouter v1

## Construction

Le modèle a été initialisé par DoctrineCorpusNet v1 puis entraîné sur 233
passages produit explicitement reliés à une capability, avec cinq labels
négatifs par positif. Les carriers recherche, transfert et archive restent
présents pour le pré-entraînement mais ne reçoivent aucun label produit.

## Validation

| Méthode | Recall@3 | Precision@3 |
| --- | ---: | ---: |
| Recouvrement lexical | 0,67 | 0,22 |
| ContrastiveDoctrineRouter v1 | 0,10 | 0,03 |

## Décision

`not_selected`. Le benchmark `contrastive-v1` n'a pas été ouvert : le modèle
échoue déjà à dépasser sa baseline sur validation. Son contenu demeure intact
pour une variante future sélectionnée par un nouveau jeu de validation.

## Interprétation bornée

L'objectif contrastif est une architecture appropriée à tester, mais ce premier
paramétrage ne produit pas un encodeur discriminant. Les explications possibles
incluent l'effectif limité, les chunks trop homogènes d'un même skill,
l'inadéquation de l'initialisation et le déséquilibre de classes. La validation
observée ne permet pas de choisir entre elles ni de les régler a posteriori.
