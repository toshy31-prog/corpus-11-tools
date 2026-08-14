# CAP.FICTION_MECHANISM_TRANSFORMATION — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- runtime_role: audit_only_for_inédit
- generation_source: forbidden
- may_reject_draft: yes
- may_supply_replacement_theme_or_moral: no
- statut: candidate_unvalidated
- classe: retain_composite
- modules sources: 18,10,16
- rationale: Capacité composite spécifique: mécanisme, forme, reste et anti-régression fictionnels.


## Relations pertinentes du graphe 11.x

- `CAP.FICTION_MECHANISM_TRANSFORMATION --requires[critical]--> CAP.DIFFERENCE_REMAINDER_ASSESSMENT`
- `CAP.FICTION_MECHANISM_TRANSFORMATION --uses[contextual]--> CAP.METHOD_EFFECT_AUDIT`
- `CAP.FICTION_MECHANISM_TRANSFORMATION --uses[contextual]--> CAP.FRAMING_REGRESSION_DETECTION`


## Backlinks 10.x

### M10 · `concept_creation_gate` · SCHEMA · lignes 96-99
- source_key: `@block`
- projection_id: `SRCFRAG.M10.CONCEPT_CREATION_GATE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@concept_creation_gate{
require:["mécanisme","observable","erreur_évitée","recours","condition_d_échec"];
public_rule:"terme_public_nouveau_seulement_si_gain_net";
}
```

### M10 · `concept_creation_gate` · SCHEMA · lignes 97-97
- source_key: `require`
- projection_id: `SCHEMA.M10.CONCEPT_CREATION_GATE.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:["mécanisme","observable","erreur_évitée","recours","condition_d_échec"];
```

### M10 · `concept_creation_gate` · RULE · lignes 98-98
- source_key: `public_rule`
- projection_id: `RULE.M10.CONCEPT_CREATION_GATE.PUBLIC_RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
public_rule:"terme_public_nouveau_seulement_si_gain_net";
```

### M18 · `pre_generation_gate` · SCHEMA · lignes 14-23
- source_key: `@block`
- projection_id: `SRCFRAG.M18.PRE_GENERATION_GATE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@pre_generation_gate{
ask:[
"quelle_machine_narrative_habituelle_s_activerait_par_défaut?";
"quelles_béquilles_reviendraient:individu_stable,famille,deuil,enfant_liminal,porte,administration,révélation,refus_moral,mystère_final?";
"quel_élément_de_la_demande_exige_de_modifier_la_forme_et_non_seulement_le_contenu?";
"qui_ou_quoi_peut_agir,souffrir,se_transmettre_ou_persister_sans_devenir_personnage_humain_déguisé?";
"quelle_conséquence_ne_peut_pas_être_déduite_d_une_thèse_préalable?";
];
rule:"si_les_réponses_reconduisent_machine_connue→ne_pas_rédiger;permuter_les_conditions_de_fiction";
}
```

### M18 · `pre_generation_gate` · SCHEMA · lignes 15-21
- source_key: `ask`
- projection_id: `SCHEMA.M18.PRE_GENERATION_GATE.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"quelle_machine_narrative_habituelle_s_activerait_par_défaut?";
"quelles_béquilles_reviendraient:individu_stable,famille,deuil,enfant_liminal,porte,administration,révélation,refus_moral,mystère_final?";
"quel_élément_de_la_demande_exige_de_modifier_la_forme_et_non_seulement_le_contenu?";
"qui_ou_quoi_peut_agir,souffrir,se_transmettre_ou_persister_sans_devenir_personnage_humain_déguisé?";
"quelle_conséquence_ne_peut_pas_être_déduite_d_une_thèse_préalable?";
];
```

### M18 · `pre_generation_gate` · RULE · lignes 22-22
- source_key: `rule`
- projection_id: `RULE.M18.PRE_GENERATION_GATE.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `compound_unresolved`
- a2_confidence: `unresolved`

```text
rule:"si_les_réponses_reconduisent_machine_connue→ne_pas_rédiger;permuter_les_conditions_de_fiction";
```

### M18 · `form_transformation` · SCHEMA · lignes 54-74
- source_key: `@block`
- projection_id: `SRCFRAG.M18.FORM_TRANSFORMATION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@form_transformation{
vary_any:[
"unité_du_personnage";
"continuité_de_l_identité";
"porteur_de_mémoire";
"source_de_l_action";
"relation_cause/effet";
"statut_de_l_objet";
"échelle_temporelle";
"grammaire_du_point_de_vue";
"mode_de_transmission";
"condition_de_clôture";
];
require:[
"variation_matérielle";
"effet_sur_au_moins_trois_dimensions_du_récit";
"coût_narratif_assumé";
"aucun_retour_final_qui_rétablit_discrètement_la_forme_initiale";
];
rule:"ajouter_un_monde_étrange_autour_d_un_sujet_moderne_stable→forme_non_transformée";
}
```

### M18 · `form_transformation` · SCHEMA · lignes 55-66
- source_key: `vary_any`
- projection_id: `SCHEMA.M18.FORM_TRANSFORMATION.VARY_ANY`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
vary_any:[
"unité_du_personnage";
"continuité_de_l_identité";
"porteur_de_mémoire";
"source_de_l_action";
"relation_cause/effet";
"statut_de_l_objet";
"échelle_temporelle";
"grammaire_du_point_de_vue";
"mode_de_transmission";
"condition_de_clôture";
];
```

### M18 · `form_transformation` · SCHEMA · lignes 67-72
- source_key: `require`
- projection_id: `SCHEMA.M18.FORM_TRANSFORMATION.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[
"variation_matérielle";
"effet_sur_au_moins_trois_dimensions_du_récit";
"coût_narratif_assumé";
"aucun_retour_final_qui_rétablit_discrètement_la_forme_initiale";
];
```

### M18 · `form_transformation` · RULE · lignes 73-73
- source_key: `rule`
- projection_id: `RULE.M18.FORM_TRANSFORMATION.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"ajouter_un_monde_étrange_autour_d_un_sujet_moderne_stable→forme_non_transformée";
```

### M18 · `idea_costume_test` · SCHEMA · lignes 76-85
- source_key: `@block`
- projection_id: `SRCFRAG.M18.IDEA_COSTUME_TEST`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@idea_costume_test{
ask:[
"chaque_personnage_a-t-il_une_fonction_conceptuelle_unique?";
"les_dialogues_expliquent-ils_le_mécanisme?";
"toutes_les_images_convergent-elles_vers_une_seule_thèse?";
"la_fin_reformule-t-elle_la_leçon?";
"le_récit_peut-il_être_résumé_par_et_si_X_devenait_littéral?";
];
rule:"oui_majoritaire→fiction_à_idée_costumée;introduire_des_conséquences_non_programmées_ou_changer_la_machine";
}
```

### M18 · `idea_costume_test` · SCHEMA · lignes 77-83
- source_key: `ask`
- projection_id: `SCHEMA.M18.IDEA_COSTUME_TEST.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"chaque_personnage_a-t-il_une_fonction_conceptuelle_unique?";
"les_dialogues_expliquent-ils_le_mécanisme?";
"toutes_les_images_convergent-elles_vers_une_seule_thèse?";
"la_fin_reformule-t-elle_la_leçon?";
"le_récit_peut-il_être_résumé_par_et_si_X_devenait_littéral?";
];
```

### M18 · `idea_costume_test` · RULE · lignes 84-84
- source_key: `rule`
- projection_id: `RULE.M18.IDEA_COSTUME_TEST.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `compound_unresolved`
- a2_confidence: `unresolved`

```text
rule:"oui_majoritaire→fiction_à_idée_costumée;introduire_des_conséquences_non_programmées_ou_changer_la_machine";
```

### M18 · `draft_audit` · SCHEMA · lignes 106-120
- source_key: `@block`
- projection_id: `SRCFRAG.M18.DRAFT_AUDIT`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@draft_audit{
ask:[
"une_scène_peut-elle_être_racontée_en_verbes_concrets_sans_perdre_le_récit?";
"un_désir,risque,besoin,perte_ou_attachement_est-il_perceptible?";
"l_étrangeté_repose-t-elle_surtout_sur_abstraction,paradoxe_ou_lexique?";
"la_méthode_a-t-elle_mangé_la_scène?";
"le_récit_produit-il_une_suite_que_la_prémisse_ne_contenait_pas?";
"au_moins_trois_structures_ont-elles_effectivement_changé?";
"quel_passage_reconstitue_la_machine_ancienne?";
"quel_personnage_déborde_son_rôle?";
"quel_reste_survit_à_toute_interprétation_unique?";
"la_fin_ouvre-t-elle_un_futur_ou_seulement_un_commentaire?";
];
rule:"échec_d_un_test_central→réécrire_avant_livraison,non_après_relance";
}
```

### M18 · `draft_audit` · SCHEMA · lignes 107-118
- source_key: `ask`
- projection_id: `SCHEMA.M18.DRAFT_AUDIT.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"une_scène_peut-elle_être_racontée_en_verbes_concrets_sans_perdre_le_récit?";
"un_désir,risque,besoin,perte_ou_attachement_est-il_perceptible?";
"l_étrangeté_repose-t-elle_surtout_sur_abstraction,paradoxe_ou_lexique?";
"la_méthode_a-t-elle_mangé_la_scène?";
"le_récit_produit-il_une_suite_que_la_prémisse_ne_contenait_pas?";
"au_moins_trois_structures_ont-elles_effectivement_changé?";
"quel_passage_reconstitue_la_machine_ancienne?";
"quel_personnage_déborde_son_rôle?";
"quel_reste_survit_à_toute_interprétation_unique?";
"la_fin_ouvre-t-elle_un_futur_ou_seulement_un_commentaire?";
];
```

### M18 · `draft_audit` · RULE · lignes 119-119
- source_key: `rule`
- projection_id: `RULE.M18.DRAFT_AUDIT.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"échec_d_un_test_central→réécrire_avant_livraison,non_après_relance";
```

### M18 · `gravity_test` · SCHEMA · lignes 156-171
- source_key: `@block`
- projection_id: `SRCFRAG.M18.GRAVITY_TEST`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@gravity_test{
ask:[
"qu_est-ce_qui_fait_peser_les_événements?";
"quel_type_de_perte_compte?";
"quelle_question_la_fin_rend-elle_inévitable?";
"quelle_distribution_de_responsabilité_est_naturalisée?";
"quel_concept_du_corpus_réapparaît_sans_son_nom?";
];
fail:[
"responsabilité_comme_destination_automatique";
"archives_ou_preuve_comme_moteur_automatique";
"pouvoir_et_recours_comme_seule_gravité";
"réparation_ou_futur_empêché_comme_clôture_automatique";
];
fence:"ces_motifs_restent_autorisés_si_demandés;ils_sont_bloqués_seulement_quand_l_extériorité_est_la_scène";
}
```

### M18 · `gravity_test` · SCHEMA · lignes 157-163
- source_key: `ask`
- projection_id: `SCHEMA.M18.GRAVITY_TEST.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"qu_est-ce_qui_fait_peser_les_événements?";
"quel_type_de_perte_compte?";
"quelle_question_la_fin_rend-elle_inévitable?";
"quelle_distribution_de_responsabilité_est_naturalisée?";
"quel_concept_du_corpus_réapparaît_sans_son_nom?";
];
```

### M18 · `gravity_test` · SCHEMA · lignes 164-169
- source_key: `fail`
- projection_id: `SCHEMA.M18.GRAVITY_TEST.FAIL`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
fail:[
"responsabilité_comme_destination_automatique";
"archives_ou_preuve_comme_moteur_automatique";
"pouvoir_et_recours_comme_seule_gravité";
"réparation_ou_futur_empêché_comme_clôture_automatique";
];
```

### M18 · `gravity_test` · RULE · lignes 170-170
- source_key: `fence`
- projection_id: `RULE.M18.GRAVITY_TEST.FENCE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
fence:"ces_motifs_restent_autorisés_si_demandés;ils_sont_bloqués_seulement_quand_l_extériorité_est_la_scène";
```

### M18 · `pre_delivery_non_regression` · SCHEMA · lignes 173-182
- source_key: `@block`
- projection_id: `SRCFRAG.M18.PRE_DELIVERY_NON_REGRESSION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@pre_delivery_non_regression{
require:[
"machine_survit_sans_décor";
"au_moins_trois_dimensions_formelles_transformées";
"aucun_noyau_exclu_ne_redevient_morale";
"fin_ne_traduit_pas_le_monde_en_message";
"conséquence_non_programmée_par_la_prémisse";
];
rule:"un_seul_échec→ne_pas_livrer;repartir_des_conditions_de_fiction";
}
```

### M18 · `pre_delivery_non_regression` · SCHEMA · lignes 174-180
- source_key: `require`
- projection_id: `SCHEMA.M18.PRE_DELIVERY_NON_REGRESSION.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[
"machine_survit_sans_décor";
"au_moins_trois_dimensions_formelles_transformées";
"aucun_noyau_exclu_ne_redevient_morale";
"fin_ne_traduit_pas_le_monde_en_message";
"conséquence_non_programmée_par_la_prémisse";
];
```

### M18 · `pre_delivery_non_regression` · RULE · lignes 181-181
- source_key: `rule`
- projection_id: `RULE.M18.PRE_DELIVERY_NON_REGRESSION.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `compound_unresolved`
- a2_confidence: `unresolved`

```text
rule:"un_seul_échec→ne_pas_livrer;repartir_des_conditions_de_fiction";
```
