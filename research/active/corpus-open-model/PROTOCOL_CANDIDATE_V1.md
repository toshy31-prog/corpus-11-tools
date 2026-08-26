# Protocole de partition — supervision candidate v1

## Unité de séparation

La partition est déterminée par `scenario_family`, jamais par l'identifiant ou
l'ordre de ligne. Une famille représente le même mécanisme sous une ou plusieurs
formulations ; la séparer entre partitions créerait une fuite de paraphrase.

## Usages autorisés

| Partition | Usage |
| --- | --- |
| `train` | entraînement d'un nouveau candidat uniquement |
| `validation` | sélection d'architecture, seuils et arrêt |
| `test` | une seule évaluation finale, après sélection ; jamais entraînement ni réglage |

Les évaluations historiques et benchmark v1 restent observés et ne doivent pas
être utilisés pour sélectionner une nouvelle variante. Le test v1 candidat est
synthétique et interne : un succès ne vaut pas validation externe.

## Condition de passage

Une architecture peut atteindre le test seulement si elle dépasse, sur
`validation`, une baseline de recouvrement lexical et le meilleur candidat
antérieur sur une métrique fixée avant le test, sans diminution matérielle de
l'abstention sur négatifs.
