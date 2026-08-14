# CAP.METHOD_EFFECT_AUDIT — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 2,9,10,12,18
- rationale: Même mécanisme: le dispositif produit/masque/remplace une partie de l'objet évalué.


## Relations pertinentes du graphe 11.x

- `CAP.CHANGE_VALIDATION --requires[critical]--> CAP.METHOD_EFFECT_AUDIT`
- `CAP.FICTION_MECHANISM_TRANSFORMATION --uses[contextual]--> CAP.METHOD_EFFECT_AUDIT`
- `CAP.USER_AGENCY_PRESERVATION --uses[contextual]--> CAP.METHOD_EFFECT_AUDIT`


## Backlinks 10.x

### M02 · `measurement_effect` · SCHEMA · lignes 118-121
- source_key: `@block`
- projection_id: `SRCFRAG.M02.MEASUREMENT_EFFECT`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@measurement_effect{
require:[état_avant,protocole,fenêtre,perturbation,état_après,perte,compensation,trace,réversibilité];
rule:"protocole_modifiant_l_état→résultat_non_indépendant";
}
```

### M02 · `measurement_effect` · SCHEMA · lignes 119-119
- source_key: `require`
- projection_id: `SCHEMA.M02.MEASUREMENT_EFFECT.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[état_avant,protocole,fenêtre,perturbation,état_après,perte,compensation,trace,réversibilité];
```

### M02 · `measurement_effect` · RULE · lignes 120-120
- source_key: `rule`
- projection_id: `RULE.M02.MEASUREMENT_EFFECT.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"protocole_modifiant_l_état→résultat_non_indépendant";
```

### M09 · `blind_output_audit` · SCHEMA · lignes 49-62
- source_key: `@block`
- projection_id: `SRCFRAG.M09.BLIND_OUTPUT_AUDIT`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@blind_output_audit{
ask:[
"que_voit-on_réellement?";
"qui_agit?";
"qui_est_passif,décor,menace_ou_bénéficiaire?";
"où_commence_l_histoire?";
"quelles_relations_sont_démontrées_ou_légendées?";
"où_migre_le_centre?";
"quel_raccourci_remplace_causalité?";
"l_image_attribue-t-elle_conscience?";
"montre-t-elle_performance_sans_coût?";
"transforme-t-elle_coordination_en_chef_caché?";
];
}
```

### M09 · `blind_output_audit` · SCHEMA · lignes 50-61
- source_key: `ask`
- projection_id: `SCHEMA.M09.BLIND_OUTPUT_AUDIT.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"que_voit-on_réellement?";
"qui_agit?";
"qui_est_passif,décor,menace_ou_bénéficiaire?";
"où_commence_l_histoire?";
"quelles_relations_sont_démontrées_ou_légendées?";
"où_migre_le_centre?";
"quel_raccourci_remplace_causalité?";
"l_image_attribue-t-elle_conscience?";
"montre-t-elle_performance_sans_coût?";
"transforme-t-elle_coordination_en_chef_caché?";
];
```

### M10 · `method_self_audit` · SCHEMA · lignes 124-135
- source_key: `@block`
- projection_id: `SRCFRAG.M10.METHOD_SELF_AUDIT`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@method_self_audit{
ask:[
"quel_biais_auditeur?";
"quelle_variable_figée?";
"quelle_scène_remplacée?";
"quelle_preuve_endogène?";
"quel_remède_reproduit_faute?";
"quelle_invention_féconde_lue_comme_erreur?";
"quelle_erreur_protégée_par_créativité?";
"quelle_conclusion_retardée_par_la_méthode?";
];
}
```

### M10 · `method_self_audit` · SCHEMA · lignes 125-134
- source_key: `ask`
- projection_id: `SCHEMA.M10.METHOD_SELF_AUDIT.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"quel_biais_auditeur?";
"quelle_variable_figée?";
"quelle_scène_remplacée?";
"quelle_preuve_endogène?";
"quel_remède_reproduit_faute?";
"quelle_invention_féconde_lue_comme_erreur?";
"quelle_erreur_protégée_par_créativité?";
"quelle_conclusion_retardée_par_la_méthode?";
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

### M18 · `scene_life_gate` · SCHEMA · lignes 26-42
- source_key: `@block`
- projection_id: `SRCFRAG.M18.SCENE_LIFE_GATE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@scene_life_gate{
principle:"l_inédit_ne_dispense_jamais_du_récit";
require:[
"une_scène_située_où_quelque_chose_arrive";
"au_moins_un_désir,risque,besoin,perte_ou_attachement_perceptible";
"un_agent,une_relation_ou_un_processus_dont_la_trajectoire_peut_changer";
"une conséquence_matérielle_ou_sensible_non_réductible_à_une_idée";
"lisibilité_locale_suffisante_pour_que_le_lecteur_puisse_suivre_ce_qui_change";
];
rules:[
"nouveauté_formelle_ne_peut_pas_remplacer_prise_sensible";
"abstraction_cosmologique,paradoxe_ou_néologisme_sans_scène→échec";
"méthode_qui_mange_scène→méthode_doît_céder";
"corps_humain_non_requis;prise_narrative_requise";
"scène_concrète≠retour_obligatoire_au_réalisme";
]
}
```

### M18 · `scene_life_gate` · SCHEMA · lignes 27-27
- source_key: `principle`
- projection_id: `SCHEMA.M18.SCENE_LIFE_GATE.PRINCIPLE`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
principle:"l_inédit_ne_dispense_jamais_du_récit";
```

### M18 · `scene_life_gate` · SCHEMA · lignes 28-34
- source_key: `require`
- projection_id: `SCHEMA.M18.SCENE_LIFE_GATE.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[
"une_scène_située_où_quelque_chose_arrive";
"au_moins_un_désir,risque,besoin,perte_ou_attachement_perceptible";
"un_agent,une_relation_ou_un_processus_dont_la_trajectoire_peut_changer";
"une conséquence_matérielle_ou_sensible_non_réductible_à_une_idée";
"lisibilité_locale_suffisante_pour_que_le_lecteur_puisse_suivre_ce_qui_change";
];
```

### M18 · `scene_life_gate` · RULE · lignes 35-42
- source_key: `rules[0]`
- projection_id: `RULE.M18.SCENE_LIFE_GATE.RULES_01`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"nouveauté_formelle_ne_peut_pas_remplacer_prise_sensible";
"abstraction_cosmologique,paradoxe_ou_néologisme_sans_scène→échec";
"méthode_qui_mange_scène→méthode_doît_céder";
"corps_humain_non_requis;prise_narrative_requise";
"scène_concrète≠retour_obligatoire_au_réalisme";
]
}
```

### M18 · `scene_life_gate` · RULE · lignes 35-42
- source_key: `rules[1]`
- projection_id: `RULE.M18.SCENE_LIFE_GATE.RULES_02`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rules:[
"nouveauté_formelle_ne_peut_pas_remplacer_prise_sensible";
"abstraction_cosmologique,paradoxe_ou_néologisme_sans_scène→échec";
"méthode_qui_mange_scène→méthode_doît_céder";
"corps_humain_non_requis;prise_narrative_requise";
"scène_concrète≠retour_obligatoire_au_réalisme";
]
}
```

### M18 · `scene_life_gate` · RULE · lignes 35-42
- source_key: `rules[2]`
- projection_id: `RULE.M18.SCENE_LIFE_GATE.RULES_03`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rules:[
"nouveauté_formelle_ne_peut_pas_remplacer_prise_sensible";
"abstraction_cosmologique,paradoxe_ou_néologisme_sans_scène→échec";
"méthode_qui_mange_scène→méthode_doît_céder";
"corps_humain_non_requis;prise_narrative_requise";
"scène_concrète≠retour_obligatoire_au_réalisme";
]
}
```

### M18 · `scene_life_gate` · RULE · lignes 35-42
- source_key: `rules[3]`
- projection_id: `RULE.M18.SCENE_LIFE_GATE.RULES_04`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"nouveauté_formelle_ne_peut_pas_remplacer_prise_sensible";
"abstraction_cosmologique,paradoxe_ou_néologisme_sans_scène→échec";
"méthode_qui_mange_scène→méthode_doît_céder";
"corps_humain_non_requis;prise_narrative_requise";
"scène_concrète≠retour_obligatoire_au_réalisme";
]
}
```

### M18 · `scene_life_gate` · RULE · lignes 35-42
- source_key: `rules[4]`
- projection_id: `RULE.M18.SCENE_LIFE_GATE.RULES_05`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"nouveauté_formelle_ne_peut_pas_remplacer_prise_sensible";
"abstraction_cosmologique,paradoxe_ou_néologisme_sans_scène→échec";
"méthode_qui_mange_scène→méthode_doît_céder";
"corps_humain_non_requis;prise_narrative_requise";
"scène_concrète≠retour_obligatoire_au_réalisme";
]
}
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
