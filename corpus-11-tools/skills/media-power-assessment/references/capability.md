# CAP.MEDIA_POWER_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain_specialization
- modules sources: 16,10
- rationale: Mécanisme matériel propre: sélection, circulation, répétition, clôture médiatique.


## Relations pertinentes du graphe 11.x

- `FAM.INDIRECT_POWER_ANALYSIS --specialization[contextual]--> CAP.MEDIA_POWER_ASSESSMENT`
- `CAP.MEDIA_POWER_ASSESSMENT --uses[contextual]--> CAP.SOURCE_ENVIRONMENT_ASSESSMENT`


## Backlinks 10.x

### M10 · `source_environment_drill` · SCHEMA · lignes 74-84
- source_key: `@block`
- projection_id: `SRCFRAG.M10.SOURCE_ENVIRONMENT_DRILL`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@source_environment_drill{
run:[
"identifier_auteur,institution,mandat,financement,public";
"langue_initiale,traductions,indexation";
"données_primaires_et_reprises";
"ce_que_format_peut_recevoir";
"qui_peut_contester_et_clore";
"capacité_politique_du_récit";
"fait_faisant_perdre_cadrage";
];
}
```

### M10 · `source_environment_drill` · PROCEDURE · lignes 75-83
- source_key: `run`
- projection_id: `PROC.M10.SOURCE_ENVIRONMENT_DRILL.RUN`
- semantic_role: `run_sequence`
- a2_role: `ordered_procedure`
- a2_confidence: `high`

```text
run:[
"identifier_auteur,institution,mandat,financement,public";
"langue_initiale,traductions,indexation";
"données_primaires_et_reprises";
"ce_que_format_peut_recevoir";
"qui_peut_contester_et_clore";
"capacité_politique_du_récit";
"fait_faisant_perdre_cadrage";
];
```

### M16 · `media_power` · SCHEMA · lignes 97-113
- source_key: `@block`
- projection_id: `SRCFRAG.M16.MEDIA_POWER`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@media_power{
layers:[
"texte";
"sélection_des_événements";
"circulation_des_sources";
"infrastructure_editoriale";
"effet_politique";
];
ask:[
"propriétaires,annonceurs,lectorat,alliances?";
"accès_aux_gouvernements,armées,experts?";
"risques_juridiques?";
"quel_récit_a_plus_pouvoir_de_répétition?";
"quel_mot_ouvre_ou_ferme_protection,recours,légitimité?";
];
rule:"ligne_editoriale=distribution_de_l_accès_au_réel_public";
}
```

### M16 · `media_power` · SCHEMA · lignes 98-104
- source_key: `layers`
- projection_id: `SCHEMA.M16.MEDIA_POWER.LAYERS`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
layers:[
"texte";
"sélection_des_événements";
"circulation_des_sources";
"infrastructure_editoriale";
"effet_politique";
];
```

### M16 · `media_power` · SCHEMA · lignes 105-111
- source_key: `ask`
- projection_id: `SCHEMA.M16.MEDIA_POWER.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"propriétaires,annonceurs,lectorat,alliances?";
"accès_aux_gouvernements,armées,experts?";
"risques_juridiques?";
"quel_récit_a_plus_pouvoir_de_répétition?";
"quel_mot_ouvre_ou_ferme_protection,recours,légitimité?";
];
```

### M16 · `media_power` · RULE · lignes 112-112
- source_key: `rule`
- projection_id: `RULE.M16.MEDIA_POWER.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"ligne_editoriale=distribution_de_l_accès_au_réel_public";
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
