# CAP.CHANGE_VALIDATION — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain_composite
- modules sources: 12,13
- rationale: Distingue inscription, test, autorisation, déploiement et réobservation; mécanisme lifecycle spécifique.


## Relations pertinentes du graphe 11.x

- `CAP.CHANGE_VALIDATION --requires[critical]--> CAP.METHOD_EFFECT_AUDIT`
- `CAP.CHANGE_VALIDATION --uses[critical]--> CAP.PROTOCOL_ROBUSTNESS`


## Backlinks 10.x

### M12 · `change_status` · SCHEMA · lignes 16-34
- source_key: `@block`
- projection_id: `SRCFRAG.M12.CHANGE_STATUS`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@change_status{
levels:[
"déclaré";
"adapté_localement";
"patch_proposé";
"patch_inscrit";
"tests_passés";
"autorisé";
"déployé";
"réobservé";
];
rules:[
"ne_jamais_attribuer_un_niveau_non_tracé";
"adapté_localement_s_arrête_avec_contexte_sauf_support_persistant";
"patch_inscrit_sans_test≠correction";
"tests_passés_sans_déploiement≠version_active";
"déploiement_sans_réobservation≠capacité_robuste";
];
}
```

### M12 · `change_status` · SCHEMA · lignes 17-26
- source_key: `levels`
- projection_id: `SCHEMA.M12.CHANGE_STATUS.LEVELS`
- semantic_role: `declared_structure`
- a2_role: `nan`
- a2_confidence: `nan`

```text
levels:[
"déclaré";
"adapté_localement";
"patch_proposé";
"patch_inscrit";
"tests_passés";
"autorisé";
"déployé";
"réobservé";
];
```

### M12 · `change_status` · RULE · lignes 27-33
- source_key: `rules[0]`
- projection_id: `RULE.M12.CHANGE_STATUS.RULES_01`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"ne_jamais_attribuer_un_niveau_non_tracé";
"adapté_localement_s_arrête_avec_contexte_sauf_support_persistant";
"patch_inscrit_sans_test≠correction";
"tests_passés_sans_déploiement≠version_active";
"déploiement_sans_réobservation≠capacité_robuste";
];
```

### M12 · `change_status` · RULE · lignes 27-33
- source_key: `rules[1]`
- projection_id: `RULE.M12.CHANGE_STATUS.RULES_02`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"ne_jamais_attribuer_un_niveau_non_tracé";
"adapté_localement_s_arrête_avec_contexte_sauf_support_persistant";
"patch_inscrit_sans_test≠correction";
"tests_passés_sans_déploiement≠version_active";
"déploiement_sans_réobservation≠capacité_robuste";
];
```

### M12 · `change_status` · RULE · lignes 27-33
- source_key: `rules[2]`
- projection_id: `RULE.M12.CHANGE_STATUS.RULES_03`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"ne_jamais_attribuer_un_niveau_non_tracé";
"adapté_localement_s_arrête_avec_contexte_sauf_support_persistant";
"patch_inscrit_sans_test≠correction";
"tests_passés_sans_déploiement≠version_active";
"déploiement_sans_réobservation≠capacité_robuste";
];
```

### M12 · `change_status` · RULE · lignes 27-33
- source_key: `rules[3]`
- projection_id: `RULE.M12.CHANGE_STATUS.RULES_04`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"ne_jamais_attribuer_un_niveau_non_tracé";
"adapté_localement_s_arrête_avec_contexte_sauf_support_persistant";
"patch_inscrit_sans_test≠correction";
"tests_passés_sans_déploiement≠version_active";
"déploiement_sans_réobservation≠capacité_robuste";
];
```

### M12 · `change_status` · RULE · lignes 27-33
- source_key: `rules[4]`
- projection_id: `RULE.M12.CHANGE_STATUS.RULES_05`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"ne_jamais_attribuer_un_niveau_non_tracé";
"adapté_localement_s_arrête_avec_contexte_sauf_support_persistant";
"patch_inscrit_sans_test≠correction";
"tests_passés_sans_déploiement≠version_active";
"déploiement_sans_réobservation≠capacité_robuste";
];
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

### M12 · `change_protocol` · SCHEMA · lignes 79-96
- source_key: `@block`
- projection_id: `SRCFRAG.M12.CHANGE_PROTOCOL`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@change_protocol{
run:[
"collecter_échecs_observés";
"inclure_relances_user_comme_traces";
"regrouper_par_classe";
"identifier_variable_latente";
"mesurer_coût_opérationnel_et_coût_de_non-conclusion";
"réviser_source_unique";
"mettre_à_jour_tests";
"refactoriser_doublons";
"produire_migration,manifest,validation,audit_diff";
"distinguer_terme_interne/public";
"fusionner_concepts_même_mécanisme";
"exiger_décision,conclusion,recours_ou_test_modifié";
"tester_cas_liminal_non_universalisé";
];
rule:"aucune_nouvelle_règle_sans_échec,risque_ou_gain_discriminant";
}
```

### M12 · `change_protocol` · PROCEDURE · lignes 80-94
- source_key: `run`
- projection_id: `PROC.M12.CHANGE_PROTOCOL.RUN`
- semantic_role: `run_sequence`
- a2_role: `ordered_procedure`
- a2_confidence: `high`

```text
run:[
"collecter_échecs_observés";
"inclure_relances_user_comme_traces";
"regrouper_par_classe";
"identifier_variable_latente";
"mesurer_coût_opérationnel_et_coût_de_non-conclusion";
"réviser_source_unique";
"mettre_à_jour_tests";
"refactoriser_doublons";
"produire_migration,manifest,validation,audit_diff";
"distinguer_terme_interne/public";
"fusionner_concepts_même_mécanisme";
"exiger_décision,conclusion,recours_ou_test_modifié";
"tester_cas_liminal_non_universalisé";
];
```

### M12 · `change_protocol` · RULE · lignes 95-95
- source_key: `rule`
- projection_id: `RULE.M12.CHANGE_PROTOCOL.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"aucune_nouvelle_règle_sans_échec,risque_ou_gain_discriminant";
```

### M13 · `static_checks` · SCHEMA · lignes 31-37
- source_key: `@block`
- projection_id: `SRCFRAG.M13.STATIC_CHECKS`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@static_checks{
"00_chars":"≤7990";
"versions":"10.3_sur_fichiers_modifiés";
"sources_uniques":"18=fiction_externalité;10=drill;12=maintenance;13=validation";
"migration":"présente";
"manifest":"présent";
}
```

### M13 · `verdict` · SCHEMA · lignes 39-43
- source_key: `@block`
- projection_id: `SRCFRAG.M13.VERDICT`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@verdict{
status:"accepté_statiquement_comme_patch_livrable";
not_established:["autorisation_hôte","déploiement","réobservation_sur_population_indépendante"];
condition_activation:"inscription_dans_configuration_hôte+autorisation+déploiement";
}
```

### M13 · `verdict` · SCHEMA · lignes 40-40
- source_key: `status`
- projection_id: `SCHEMA.M13.VERDICT.STATUS`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
status:"accepté_statiquement_comme_patch_livrable";
```

### M13 · `verdict` · SCHEMA · lignes 41-41
- source_key: `not_established`
- projection_id: `SCHEMA.M13.VERDICT.NOT_ESTABLISHED`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
not_established:["autorisation_hôte","déploiement","réobservation_sur_population_indépendante"];
```

### M13 · `verdict` · SCHEMA · lignes 42-42
- source_key: `condition_activation`
- projection_id: `SCHEMA.M13.VERDICT.CONDITION_ACTIVATION`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
condition_activation:"inscription_dans_configuration_hôte+autorisation+déploiement";
```
