# CAP.CAPABILITY_INTERFERENCE_AUDIT — provenance opérationnelle

> Statut du nœud : candidat de conception non validé, ajouté comme garde-fou de croissance du carquois.

## Définition runtime

- statut: design_candidate_unvalidated
- classe: new_meta_nonregression_assessment
- source de conception: risque anticipé de chevauchement et d'effets d'ordre au-delà de 48 skills

## Relations pertinentes du graphe 11.x

- `CAP.CAPABILITY_INTERFERENCE_AUDIT --requires[critical]--> CAP.CHANGE_VALIDATION`
- `CAP.CAPABILITY_INTERFERENCE_AUDIT --uses[critical]--> CAP.METHOD_EFFECT_AUDIT`
- `CAP.CAPABILITY_INTERFERENCE_AUDIT --uses[contextual]--> CAP.EFFECTIVE_PRESENCE_ASSESSMENT`

## Schéma minimal

`baseline_capabilities`, `candidate_change`, `task_set`, `task_evidence`, `baseline_routes`, `candidate_routes`, `order_permutations`, `baseline_outputs`, `candidate_outputs`, `material_deltas`, `overlap`, `conflicts`, `shadowed_capabilities`, `invocation_cost`, `reversal_condition`.

## Procédure candidate

1. Geler un jeu de tâches contenant déclencheurs positifs, négatifs, cas liminaux et compositions.
2. Capturer routage, dépendances chargées, verdict et conclusion matérielle avant changement.
3. Ajouter ou retirer une capacité sans modifier les preuves des tâches.
4. Tester les ordres significatifs lorsque plusieurs capacités s'appliquent.
5. Classer chaque delta : correction justifiée, spécialisation, redondance, ombrage, conflit ou inflation d'invocation.
6. Exiger une trace d'échec ou un gain discriminant avant de conserver une nouvelle capacité.

## Règles de verdict

- `graph_valid -> non_interference_not_yet_established`
- `new_skill_changes_conclusion_without_new_evidence_or_declared_rule -> conclusion_drift`
- `same_trigger_same_verdict_no_distinct_failure -> redundancy_candidate`
- `order_changes_material_take -> bounded_interaction_or_conflict`
- `finite_evals_pass -> tested_scope_only`, jamais robustesse universelle
