# CAP.SCALE_TRANSITION_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat de conception non validé, ajouté pour qualifier les passages micro–macro sans injecter la propriété annoncée.

## Définition runtime

- statut: design_candidate_unvalidated
- classe: new_scale_bridge_assessment
- source de conception: question centrale et blocages de la recherche au 2026-08-17

## Relations pertinentes du graphe 11.x

- `CAP.SCALE_TRANSITION_ASSESSMENT --requires[critical]--> CAP.CONSTRUCT_VALIDITY_ASSESSMENT`
- `CAP.SCALE_TRANSITION_ASSESSMENT --uses[critical]--> CAP.METHOD_EFFECT_AUDIT`
- `CAP.SCALE_TRANSITION_ASSESSMENT --uses[contextual]--> CAP.DIFFERENCE_REMAINDER_ASSESSMENT`

## Schéma minimal

`micro_states`, `micro_rules`, `boundary_conditions`, `external_inputs`, `aggregation_map`, `coarse_graining`, `macro_variable`, `macro_claim`, `symmetry_choices`, `thresholds`, `discarded_information`, `added_information`, `alternative_maps`, `matched_controls`, `scale_window`, `reversal_condition`.

## Procédure candidate

1. Définir les niveaux sans employer le macro-terme comme primitive micro.
2. Établir un registre de l'information ajoutée, héritée, perdue et sélectionnée à chaque flèche.
3. Tester si le macro-signal suit directement une définition, un ordre, une orientation ou un seuil injecté.
4. Varier l'agrégation et conserver les divergences plutôt que les moyenner.
5. Comparer à des mécanismes micro concurrents et à un contrôle sans la structure candidate.
6. Exiger une relation macro non triviale, discriminante et stable dans une fenêtre déclarée avant `emergence_candidate`.

## Règles de verdict

- `macro_property_in_micro_input -> injected`
- `macro_signal_true_by_aggregation_definition -> derived_by_definition`
- `signal_disappears_under_equally_admissible_map -> aggregation_dependent`
- `invariance_under_one_representation != scale_independence`
- `emergence_candidate != fundamental_law`
