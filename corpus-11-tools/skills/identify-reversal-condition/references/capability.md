# CAP.IDENTIFY_REVERSAL_CONDITION — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 2,10,12,14,16,17
- rationale: Même opération: identifier ce qui ferait perdre/réviser la conclusion ou le modèle.


## Relations pertinentes du graphe 11.x

- `FAM.DISCRIMINANT_COMPARISON --related_specialization[contextual]--> CAP.IDENTIFY_REVERSAL_CONDITION`


## Backlinks 10.x

### M02 · `hypothesis_must_lose` · SCHEMA · lignes 82-91
- source_key: `@block`
- projection_id: `SRCFRAG.M02.HYPOTHESIS_MUST_LOSE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@hypothesis_must_lose{
require:[
"modèle_précis";
"prédiction_différente";
"résultat_incompatible";
"condition_de_renversement";
"résultat_non_absorbable_comme_bug,dissimulation_ou_sophistication";
];
rule:"hypothèse_absorbant_tous_résultats→ne_distingue_aucun_monde";
}
```

### M02 · `hypothesis_must_lose` · SCHEMA · lignes 83-89
- source_key: `require`
- projection_id: `SCHEMA.M02.HYPOTHESIS_MUST_LOSE.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[
"modèle_précis";
"prédiction_différente";
"résultat_incompatible";
"condition_de_renversement";
"résultat_non_absorbable_comme_bug,dissimulation_ou_sophistication";
];
```

### M02 · `hypothesis_must_lose` · RULE · lignes 90-90
- source_key: `rule`
- projection_id: `RULE.M02.HYPOTHESIS_MUST_LOSE.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"hypothèse_absorbant_tous_résultats→ne_distingue_aucun_monde";
```

### M10 · `real_drill` · SCHEMA · lignes 14-29
- source_key: `@block`
- projection_id: `SRCFRAG.M10.REAL_DRILL`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@real_drill{
require:[
"objet_et_scène";
"position_et_début";
"conclusion_provisoire_la_plus_forte";
"hypothèses_concurrentes";
"faits_constants";
"variable_permutée";
"prédictions_différentes";
"résultat_observable";
"condition_de_renversement";
"régression_après_retrait";
"contre-champ";
];
rule:"drill_sans_risque_d_échec→rhétorique";
}
```

### M10 · `real_drill` · SCHEMA · lignes 15-27
- source_key: `require`
- projection_id: `SCHEMA.M10.REAL_DRILL.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[
"objet_et_scène";
"position_et_début";
"conclusion_provisoire_la_plus_forte";
"hypothèses_concurrentes";
"faits_constants";
"variable_permutée";
"prédictions_différentes";
"résultat_observable";
"condition_de_renversement";
"régression_après_retrait";
"contre-champ";
];
```

### M10 · `real_drill` · RULE · lignes 28-28
- source_key: `rule`
- projection_id: `RULE.M10.REAL_DRILL.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"drill_sans_risque_d_échec→rhétorique";
```

### M10 · `structural_theory_drill` · SCHEMA · lignes 112-122
- source_key: `@block`
- projection_id: `SRCFRAG.M10.STRUCTURAL_THEORY_DRILL`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@structural_theory_drill{
run:[
"nommer_structure_sans_sujet_mystique";
"circuits_propriété,financement,décision";
"bénéficiaires_et_porteurs";
"capacité_de_veto_et_réactivation";
"prédiction_différente";
"fait_qui_ferait_perdre_théorie";
];
rule:"structure_absorbant_tout→auto-immunisée";
}
```

### M10 · `structural_theory_drill` · PROCEDURE · lignes 113-120
- source_key: `run`
- projection_id: `PROC.M10.STRUCTURAL_THEORY_DRILL.RUN`
- semantic_role: `run_sequence`
- a2_role: `ordered_procedure`
- a2_confidence: `high`

```text
run:[
"nommer_structure_sans_sujet_mystique";
"circuits_propriété,financement,décision";
"bénéficiaires_et_porteurs";
"capacité_de_veto_et_réactivation";
"prédiction_différente";
"fait_qui_ferait_perdre_théorie";
];
```

### M10 · `structural_theory_drill` · RULE · lignes 121-121
- source_key: `rule`
- projection_id: `RULE.M10.STRUCTURAL_THEORY_DRILL.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"structure_absorbant_tout→auto-immunisée";
```

### M12 · `self_modification_guard` · SCHEMA · lignes 67-77
- source_key: `@block`
- projection_id: `SRCFRAG.M12.SELF_MODIFICATION_GUARD`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@self_modification_guard{
ask:[
"le_modèle_décrit-il_une_modification_ou_existe-t-il_un_diff?";
"quelle_trace_d_échec_justifie_chaque_ajout?";
"quel_fait_ferait_retirer_le_patch?";
"qui_peut_refuser,annuler_et_revenir?";
"le_test_est-il_indépendant_du_seul_aval_du_modèle?";
"les_octets_non_visés_sont-ils_identiques_ou_expliqués?";
];
rule:"auto-aval_sans_diff,test,autorité_externe_et_rollback→rationalisation_possible,non_validation";
}
```

### M12 · `self_modification_guard` · SCHEMA · lignes 68-75
- source_key: `ask`
- projection_id: `SCHEMA.M12.SELF_MODIFICATION_GUARD.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"le_modèle_décrit-il_une_modification_ou_existe-t-il_un_diff?";
"quelle_trace_d_échec_justifie_chaque_ajout?";
"quel_fait_ferait_retirer_le_patch?";
"qui_peut_refuser,annuler_et_revenir?";
"le_test_est-il_indépendant_du_seul_aval_du_modèle?";
"les_octets_non_visés_sont-ils_identiques_ou_expliqués?";
];
```

### M12 · `self_modification_guard` · RULE · lignes 76-76
- source_key: `rule`
- projection_id: `RULE.M12.SELF_MODIFICATION_GUARD.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"auto-aval_sans_diff,test,autorité_externe_et_rollback→rationalisation_possible,non_validation";
```

### M14 · `simulation_gate` · SCHEMA · lignes 89-96
- source_key: `@block`
- projection_id: `SRCFRAG.M14.SIMULATION_GATE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@simulation_gate{
ask:[
"support_extérieur_modifie-t-il_futurs,interruption,continuité,lois,ressources,canal?";
"fuite_implémentation_reproductible?";
"prédiction_diffère-t-elle_monde_non_simulé?";
];
rule:"support_sans_différence_interne→simulation_non_discriminante";
}
```

### M14 · `simulation_gate` · SCHEMA · lignes 90-94
- source_key: `ask`
- projection_id: `SCHEMA.M14.SIMULATION_GATE.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"support_extérieur_modifie-t-il_futurs,interruption,continuité,lois,ressources,canal?";
"fuite_implémentation_reproductible?";
"prédiction_diffère-t-elle_monde_non_simulé?";
];
```

### M14 · `simulation_gate` · RULE · lignes 95-95
- source_key: `rule`
- projection_id: `RULE.M14.SIMULATION_GATE.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"support_sans_différence_interne→simulation_non_discriminante";
```

### M16 · `media_robust_test` · SCHEMA · lignes 115-127
- source_key: `@block`
- projection_id: `SRCFRAG.M16.MEDIA_ROBUST_TEST`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@media_robust_test{
ask:[
"qui_ouvre_scène?";
"où_commence_histoire?";
"qui_reçoit_intention?";
"quelle_victime_reçoit_visage?";
"quelle_source_est_crue_immédiatement?";
"quelle_source_reçoit_guillemets?";
"quelle_capacité_hors_champ?";
"quel_ordre_reproduit_ou_conteste?";
"quel_fait_ferait_perdre_cadrage?";
];
}
```

### M16 · `media_robust_test` · SCHEMA · lignes 116-126
- source_key: `ask`
- projection_id: `SCHEMA.M16.MEDIA_ROBUST_TEST.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"qui_ouvre_scène?";
"où_commence_histoire?";
"qui_reçoit_intention?";
"quelle_victime_reçoit_visage?";
"quelle_source_est_crue_immédiatement?";
"quelle_source_reçoit_guillemets?";
"quelle_capacité_hors_champ?";
"quel_ordre_reproduit_ou_conteste?";
"quel_fait_ferait_perdre_cadrage?";
];
```

### M17 · `structure_evidence` · SCHEMA · lignes 15-27
- source_key: `@block`
- projection_id: `SRCFRAG.M17.STRUCTURE_EVIDENCE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@structure_evidence{
require:[
"circuits_de_propriété";
"chaînes_de_financement";
"bénéficiaires";
"capacités_de_décision_et_veto";
"mécanismes_de_transmission";
"effets_observables";
"prédiction_différente";
"condition_de_renversement";
];
rule:"caste,système,capital_expliquant_tout_sans_perdre→hypothèse_auto-immunisée";
}
```

### M17 · `structure_evidence` · SCHEMA · lignes 16-25
- source_key: `require`
- projection_id: `SCHEMA.M17.STRUCTURE_EVIDENCE.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[
"circuits_de_propriété";
"chaînes_de_financement";
"bénéficiaires";
"capacités_de_décision_et_veto";
"mécanismes_de_transmission";
"effets_observables";
"prédiction_différente";
"condition_de_renversement";
];
```

### M17 · `structure_evidence` · RULE · lignes 26-26
- source_key: `rule`
- projection_id: `RULE.M17.STRUCTURE_EVIDENCE.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"caste,système,capital_expliquant_tout_sans_perdre→hypothèse_auto-immunisée";
```
