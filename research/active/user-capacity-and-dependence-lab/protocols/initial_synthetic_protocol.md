# Trace synthétique d’autonomie post-assistance

## Construit et portée

Le fixture décrit un apprenant de modèle, pas une personne. Le test vérifie que
la trace distingue assistance, exécution autonome et recours disponible. Toute
conclusion est `model_internal`.

## Invariants et contrôles

- la phase autonome ne contient aucune aide cachée ;
- une réussite assistée n’est jamais lue comme capacité durable ;
- les traces de reprise et d’échec restent visibles ;
- aucun résultat n’est attribué à des utilisateurs réels.

## Retrait

Réviser le modèle si une étude avec personnes consentantes exige une autre
définition de l’autonomie ou révèle que les traces simulées masquent une charge
matérielle pertinente.
