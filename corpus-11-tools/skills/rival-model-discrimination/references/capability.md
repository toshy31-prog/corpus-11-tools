# CAP.RIVAL_MODEL_DISCRIMINATION — provenance opérationnelle

> Statut du nœud : candidat de conception non validé, distinct de l'exploration de candidats et de la seule compilation d'observables.

## Définition runtime

- statut: design_candidate_unvalidated
- classe: new_discrimination_procedure
- source de conception: lacune de comparaison exclusive observée dans l'état de recherche au 2026-08-17

## Relations pertinentes du graphe 11.x

- `FAM.DISCRIMINANT_COMPARISON --related_specialization[contextual]--> CAP.RIVAL_MODEL_DISCRIMINATION`
- `CAP.RIVAL_MODEL_DISCRIMINATION --requires[critical]--> CAP.OBSERVABLE_COMPILATION`
- `CAP.RIVAL_MODEL_DISCRIMINATION --uses[critical]--> CAP.IDENTIFY_REVERSAL_CONDITION`

## Schéma minimal

Pour chaque candidat : `claim`, `mechanism`, `inputs`, `free_parameters`, `shared_information`, `prediction`, `failure_outcome`, `scope`, `fit_rule`.

Pour la comparaison : `baseline`, `matching_dimensions`, `held_out_outcome`, `discriminating_outcome`, `result`, `survivors`, `information_gap`.

## Procédure candidate

1. Constituer les candidats avant l'audit ou conserver ceux fournis par l'utilisateur.
2. Inclure le meilleur concurrent standard pertinent, pas seulement un témoin faible.
3. Apparier portée, données accessibles, budget de paramètres et moment de sélection, ou déclarer les écarts.
4. Produire une matrice candidat × résultat avant l'observation décisive.
5. Exécuter ou évaluer le résultat tenu à l'écart.
6. Conserver tous les survivants compatibles et signaler un espace de modèles incomplet si aucun ne prédit le résultat.

## Règles de verdict

- `même_prédiction -> aucune_discrimination`
- `meilleur_fit_avec_plus_information_non_comptée -> comparaison_non_appariée`
- `baseline_choisie_après_résultat -> support_post_hoc`
- `résultat_prévu_exclusivement_par_un_survivant_sous_comparaison_appariée -> discriminates`, borné à la portée testée
- `pairwise_win != unique_selection`
