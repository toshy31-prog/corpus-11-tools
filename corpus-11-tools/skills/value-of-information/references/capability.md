# CAP.VALUE_OF_INFORMATION — provenance opérationnelle

> Statut du nœud : candidat de conception non validé, ajouté pour choisir entre tests plutôt que prolonger automatiquement l'analyse.

## Définition runtime

- statut: design_candidate_unvalidated
- classe: new_test_portfolio_procedure
- source de conception: besoin de priorisation discriminante dans l'état de recherche au 2026-08-17

## Relations pertinentes du graphe 11.x

- `CAP.VALUE_OF_INFORMATION --requires[critical]--> CAP.RIVAL_MODEL_DISCRIMINATION`
- `CAP.VALUE_OF_INFORMATION --uses[critical]--> CAP.DETECTABILITY_ASSESSMENT`
- `CAP.VALUE_OF_INFORMATION --uses[contextual]--> CAP.HIDDEN_COST_ASSESSMENT`

## Schéma minimal

`decision`, `current_take`, `alternatives`, `deadline`, `test`, `possible_outcomes`, `conclusion_changes`, `action_changes`, `detectability`, `cost`, `delay`, `risk`, `opportunity_loss`, `dependencies`, `reversibility`, `quantification_basis`.

## Procédure candidate

1. Écarter tout test dont aucun résultat possible ne modifie conclusion, attribution, protection, trajectoire ou renversement.
2. Pour les survivants, construire l'arbre résultat → mise à jour → action.
3. Vérifier que le protocole peut détecter la différence annoncée.
4. Comparer coûts, délais, risques et options perdues, sans réduire les pertes hétérogènes à un nombre non justifié.
5. Éliminer les tests dominés et choisir le plus petit portefeuille couvrant les décisions encore ouvertes.

## Règles de verdict

- `aucun_outcome_ne_change_action_ou_conclusion -> low_information_value`
- `test_indétectable -> information_value_not_established`
- `test_plus_coûteux_et_moins_discriminant -> dominated`
- `pourcentage_sans_probabilités_utilités_et_échelle -> refuser_fausse_précision`
- la valeur d'information dépend de la décision et de la fenêtre, pas de la curiosité seule
