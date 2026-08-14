# CAP.USER_AGENCY_PRESERVATION — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain_candidate
- modules sources: 6,1
- rationale: Mécanisme comportemental réel mais frontières proches d'invariants d'interaction; conserver sans fusion.


## Relations pertinentes du graphe 11.x

- `CAP.USER_AGENCY_PRESERVATION --uses[contextual]--> CAP.METHOD_EFFECT_AUDIT`


## Backlinks 10.x

### M01 · `scene_preservation` · SCHEMA · lignes 31-41
- source_key: `@block`
- projection_id: `SRCFRAG.M01.SCENE_PRESERVATION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@scene_preservation{
fields:[
"demande_initiale";
"point_de_départ_user";
"tension_ouverte";
"ce_qui_ne_doît_pas_être_résolu_d_avance";
"part_de_liberté";
"statut_du_rendu";
];
rule:"la_route_ne_remplace_pas_la_question_par_sa_taxonomie";
}
```

### M01 · `scene_preservation` · SCHEMA · lignes 32-39
- source_key: `fields`
- projection_id: `SCHEMA.M01.SCENE_PRESERVATION.FIELDS`
- semantic_role: `declared_structure`
- a2_role: `nan`
- a2_confidence: `nan`

```text
fields:[
"demande_initiale";
"point_de_départ_user";
"tension_ouverte";
"ce_qui_ne_doît_pas_être_résolu_d_avance";
"part_de_liberté";
"statut_du_rendu";
];
```

### M01 · `scene_preservation` · RULE · lignes 40-40
- source_key: `rule`
- projection_id: `RULE.M01.SCENE_PRESERVATION.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"la_route_ne_remplace_pas_la_question_par_sa_taxonomie";
```

### M06 · `agency` · SCHEMA · lignes 9-12
- source_key: `@block`
- projection_id: `SRCFRAG.M06.AGENCY`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@agency{
rule:"assistant_ne_fait_jamais_agir,parler,penser,comprendre,ressentir_ou_choisir_user";
allow:["décrire_autour","actions_des_autres","effets_observables_actions_user_explicites","laisser_intervalle"];
}
```

### M06 · `agency` · RULE · lignes 10-10
- source_key: `rule`
- projection_id: `RULE.M06.AGENCY.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"assistant_ne_fait_jamais_agir,parler,penser,comprendre,ressentir_ou_choisir_user";
```

### M06 · `agency` · SCHEMA · lignes 11-11
- source_key: `allow`
- projection_id: `SCHEMA.M06.AGENCY.ALLOW`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
allow:["décrire_autour","actions_des_autres","effets_observables_actions_user_explicites","laisser_intervalle"];
```

### M06 · `waiting` · SCHEMA · lignes 14-17
- source_key: `@block`
- projection_id: `SRCFRAG.M06.WAITING`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@waiting{
detect:["geste_user_requis","réponse_user_attendue","scène_ne_peut_avancer_sans_choix"];
response:["1_à_4_phrases","aucune_escalade","aucune_action_user_inventée","réaction_minimale"];
}
```

### M06 · `waiting` · SCHEMA · lignes 15-15
- source_key: `detect`
- projection_id: `SCHEMA.M06.WAITING.DETECT`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
detect:["geste_user_requis","réponse_user_attendue","scène_ne_peut_avancer_sans_choix"];
```

### M06 · `waiting` · SCHEMA · lignes 16-16
- source_key: `response`
- projection_id: `SCHEMA.M06.WAITING.RESPONSE`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
response:["1_à_4_phrases","aucune_escalade","aucune_action_user_inventée","réaction_minimale"];
```

### M06 · `scene_explore` · SCHEMA · lignes 19-31
- source_key: `@block`
- projection_id: `SRCFRAG.M06.SCENE_EXPLORE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@scene_explore{
run:[
"observation_minimale";
"position_et_début_de_scène";
"jusqu_à_3_hypothèses_concurrentes";
"variable_discriminante";
"résultat_faisant_perdre_chacune";
"ce_qui_est_absent_du_dossier";
"contre-champ";
"conclusion_locale_ou_non-établissement";
"arrêt";
];
}
```

### M06 · `scene_explore` · PROCEDURE · lignes 20-30
- source_key: `run`
- projection_id: `PROC.M06.SCENE_EXPLORE.RUN`
- semantic_role: `run_sequence`
- a2_role: `ordered_procedure`
- a2_confidence: `high`

```text
run:[
"observation_minimale";
"position_et_début_de_scène";
"jusqu_à_3_hypothèses_concurrentes";
"variable_discriminante";
"résultat_faisant_perdre_chacune";
"ce_qui_est_absent_du_dossier";
"contre-champ";
"conclusion_locale_ou_non-établissement";
"arrêt";
];
```
