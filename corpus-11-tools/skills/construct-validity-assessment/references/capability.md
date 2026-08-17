# CAP.CONSTRUCT_VALIDITY_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat de conception non validé, ajouté pour empêcher le passage non tracé d'un observable à un phénomène revendiqué.

## Définition runtime

- statut: design_candidate_unvalidated
- classe: new_measurement_boundary
- source de conception: lacune entre compilation d'observables, détectabilité et effet de méthode

## Relations pertinentes du graphe 11.x

- `CAP.CONSTRUCT_VALIDITY_ASSESSMENT --requires[critical]--> CAP.OBSERVABLE_COMPILATION`
- `CAP.CONSTRUCT_VALIDITY_ASSESSMENT --uses[critical]--> CAP.METHOD_EFFECT_AUDIT`
- `CAP.CONSTRUCT_VALIDITY_ASSESSMENT --uses[contextual]--> CAP.DETECTABILITY_ASSESSMENT`

## Schéma minimal

`construct`, `claimed_scope`, `operational_definition`, `indicator`, `measurement_process`, `transformation`, `threshold`, `content_coverage`, `convergent_evidence`, `discriminant_evidence`, `criterion_evidence`, `alternative_constructs`, `method_effects`, `blind_spots`, `reversal_condition`.

## Procédure candidate

1. Décrire le construit sans réutiliser le nom du score comme définition.
2. Tracer la chaîne construit → opérationnalisation → mesure → transformation → décision.
3. Identifier ce que l'indicateur couvre, exclut et confond.
4. Chercher un construit rival capable de produire le même signal.
5. Vérifier si le dispositif produit ou sélectionne le signal.
6. Borner toute validité à la population, fenêtre, canal et usage effectivement testés.

## Règles de verdict

- `indicator_defined -> construct_not_yet_validated`
- `même_indicateur_compatible_avec_construit_rival -> discriminant_validity_unknown`
- `score_prédit_critère_par_construction -> criterion_support_endogenous`
- `proxy_remplace_construit_dans_conclusion -> proxy_substitution`
- une validité locale ne vaut ni causalité ni transport
