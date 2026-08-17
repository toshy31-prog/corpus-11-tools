# CAP.CAUSAL_IDENTIFICATION — provenance opérationnelle

> Statut du nœud : candidat de conception non validé, ajouté pour combler l'absence de procédure positive entre `corrélation != causalité` et une attribution causale.

## Définition runtime

- statut: design_candidate_unvalidated
- classe: new_inference_composite
- source de conception: lacune observée dans l'architecture 11.x et blocages de recherche au 2026-08-17
- non établi: correction générale, identification à partir de toute donnée, transport hors portée

## Relations pertinentes du graphe 11.x

- `CAP.CAUSAL_IDENTIFICATION --requires[critical]--> CAP.CONSTRUCT_VALIDITY_ASSESSMENT`
- `CAP.CAUSAL_IDENTIFICATION --uses[critical]--> CAP.RIVAL_MODEL_DISCRIMINATION`
- `CAP.CAUSAL_IDENTIFICATION --uses[contextual]--> CAP.CHAIN_TRACING`

## Schéma minimal

Compiler séparément :

`cause`, `outcome`, `population`, `unit`, `time_zero`, `horizon`, `intervention`, `counterfactual_contrast`, `causal_graph`, `confounders`, `mediators`, `colliders`, `selection`, `measurement_process`, `interference`, `identification_strategy`, `assumptions`, `evidence`, `sensitivity`, `reversal_condition`.

## Procédure candidate

1. Formuler la question causale et son contraste contrefactuel.
2. Vérifier que cause et résultat ne sont pas seulement des proxies non qualifiés.
3. Représenter le plus petit graphe causal suffisant et marquer les arêtes inconnues.
4. Produire les explications rivales avant de sélectionner un ajustement ou un dessin d'étude.
5. Distinguer observation, intervention, expérience naturelle, instrument, discontinuité, contrôle négatif et hypothèse non testée.
6. Tester confusion, causalité inverse, sélection, médiation, collision, mesure, attrition et interférence entre unités.
7. Déterminer si l'effet est identifié, borné ou non identifié sous les seules hypothèses déclarées.
8. Séparer identification de l'estimation numérique et de la généralisation.

## Règles de verdict

- `association_observée AND identification_absente -> not_identified`
- `graphe_déclaré_sans_appui -> hypothèse_de_structure`, jamais preuve
- `ajustement_sur_collisionneur_ou_post_traitement -> attribution_fragilisée`
- `plusieurs_modèles_causaux_observationnellement_équivalents -> préserver_pluralité`
- `identified_under_assumptions` exige la liste des hypothèses dont dépend le verdict

Une chaîne plausible n'est pas encore une cause identifiée.
