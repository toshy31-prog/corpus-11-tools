# Porte d’admissibilité d’une évaluation indépendante

## Construit et portée

Le construit testé est l’**admissibilité procédurale** d’un cas à l’arène, non
la qualité d’une méthode Corpus. La conclusion est `pipeline_verified` : le
contrôle sait refuser un cas qui ne peut pas produire une preuve indépendante.

## Définition opérationnelle

Un cas est admissible seulement si son origine est externe aux concepteurs de
la méthode, qu’il est gelé avant exécution, et qu’un évaluateur distinct est
désigné. Le fixture est volontairement inadmissible afin de vérifier que la
porte ne fabrique pas une évaluation indépendante à partir d’une auto-évaluation.

## Invariants et contrôles

- aucun résultat de méthode n’est présent dans le fixture ;
- un cas synthétique ou lié au concepteur est rejeté ;
- un évaluateur identique à l’exécutant est rejeté ;
- la sortie ne peut pas porter le statut `external_equivalent`.

## Effet de méthode et retrait

Cette porte vérifie une règle de sélection ; elle ne mesure ni correction ni
gain décisionnel. Retirer ou modifier la règle si un cas externe documenté
montre qu’elle exclut indûment une évaluation réellement indépendante.
