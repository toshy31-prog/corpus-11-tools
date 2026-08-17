# CAP.STRATEGIC_ADAPTATION_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat de conception non validé, distinct de l'effet immédiat de méthode par sa dynamique d'apprentissage et de réponse.

## Définition runtime

- statut: design_candidate_unvalidated
- classe: new_reflexive_system_assessment
- source de conception: angle mort anticipé lors du passage des mesures aux usages institutionnels

## Relations pertinentes du graphe 11.x

- `CAP.STRATEGIC_ADAPTATION_ASSESSMENT --requires[critical]--> CAP.METHOD_EFFECT_AUDIT`
- `CAP.STRATEGIC_ADAPTATION_ASSESSMENT --uses[contextual]--> CAP.CENTER_DETECTION`
- `CAP.STRATEGIC_ADAPTATION_ASSESSMENT --uses[contextual]--> CAP.HIDDEN_COST_ASSESSMENT`

## Schéma minimal

`actors`, `metric_or_rule`, `visibility`, `stakes`, `feedback`, `learning_window`, `adaptation_channels`, `detection_channels`, `enforcement`, `countermoves`, `cost_bearers`, `displaced_outcomes`, `pre_exposure_baseline`, `post_exposure_behavior`, `reversal_condition`.

## Procédure candidate

1. Identifier qui voit la règle, quand, avec quels moyens d'adaptation et quelles pertes possibles.
2. Séparer amélioration réelle du construit, optimisation du proxy, évitement, déplacement et falsification.
3. Tracer au moins une boucle règle → réponse → mesure → contre-réponse.
4. Vérifier si la charge de conformité masque ou déplace le coût vers d'autres acteurs.
5. Tester une variation de métrique, un audit hors cible ou une observation tenue secrète lorsque légitime et proportionné.

## Règles de verdict

- `metric_becomes_target -> measurement_relation_must_be_reobserved`
- `score_improves AND construct_unknown -> no_real_improvement_claim`
- `adaptation_possible != gaming_observed`
- `contrôle_accru_sans_recours -> ne_pas_appeler_robustesse`
- un équilibre unique ne peut être affirmé sans modèle et observations correspondants
