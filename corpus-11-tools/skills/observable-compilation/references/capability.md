# CAP.OBSERVABLE_COMPILATION — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 9,2,10
- rationale: Transformer abstractions en observables est distinct de détectabilité et de simple représentation.


## Relations pertinentes du graphe 11.x

- `CAP.OBSERVABLE_COMPILATION --uses[contextual]--> CAP.DETECTABILITY_ASSESSMENT`
- `CAP.VISUAL_SCENE_COMPILATION --requires[critical]--> CAP.OBSERVABLE_COMPILATION`


## Backlinks 10.x

### M02 · `detection_audit` · SCHEMA · lignes 61-75
- source_key: `@block`
- projection_id: `SRCFRAG.M02.DETECTION_AUDIT`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@detection_audit{
require:[
"phénomène";
"traces_recevables";
"échelle,fenêtre,seuil,bruit";
"perturbation_du_protocole";
"trace_inrecevable_par_dispositif";
"qui_contrôle_archive,capteur,accès_et_publication";
"canal_sensoriel_ou_documentaire_supposé";
"histoire_d_exposition";
"conditions_absentes";
"protocole_pouvant_produire_réponse_ou_échec";
];
rule:"absence_de_trace_sans_capacité_de_détection_établie→U;contrôle_de_détectabilité→pouvoir_à_auditer";
}
```

### M02 · `detection_audit` · SCHEMA · lignes 62-73
- source_key: `require`
- projection_id: `SCHEMA.M02.DETECTION_AUDIT.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[
"phénomène";
"traces_recevables";
"échelle,fenêtre,seuil,bruit";
"perturbation_du_protocole";
"trace_inrecevable_par_dispositif";
"qui_contrôle_archive,capteur,accès_et_publication";
"canal_sensoriel_ou_documentaire_supposé";
"histoire_d_exposition";
"conditions_absentes";
"protocole_pouvant_produire_réponse_ou_échec";
];
```

### M02 · `detection_audit` · RULE · lignes 74-74
- source_key: `rule`
- projection_id: `RULE.M02.DETECTION_AUDIT.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `compound_unresolved`
- a2_confidence: `unresolved`

```text
rule:"absence_de_trace_sans_capacité_de_détection_établie→U;contrôle_de_détectabilité→pouvoir_à_auditer";
```

### M09 · `visual_ir` · SCHEMA · lignes 30-37
- source_key: `@block`
- projection_id: `SRCFRAG.M09.VISUAL_IR`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@visual_ir{
fields:[
media,scene,agents,actions,materials,before_states,after_states,capacities,costs,hidden_load,
relations,asymmetries,traces,channels,thresholds,rhythms,stops,resets,field_dependencies,
exits,returns,center_allowed,center_forbidden,style_independence,ambiguity_localization,
forbidden_substitutions,point_of_view,source_regime,temporal_start,visible_absences
];
}
```

### M09 · `visual_ir` · SCHEMA · lignes 31-36
- source_key: `fields`
- projection_id: `SCHEMA.M09.VISUAL_IR.FIELDS`
- semantic_role: `declared_structure`
- a2_role: `nan`
- a2_confidence: `nan`

```text
fields:[
media,scene,agents,actions,materials,before_states,after_states,capacities,costs,hidden_load,
relations,asymmetries,traces,channels,thresholds,rhythms,stops,resets,field_dependencies,
exits,returns,center_allowed,center_forbidden,style_independence,ambiguity_localization,
forbidden_substitutions,point_of_view,source_regime,temporal_start,visible_absences
];
```

### M09 · `observable_compiler` · SCHEMA · lignes 39-42
- source_key: `@block`
- projection_id: `SRCFRAG.M09.OBSERVABLE_COMPILER`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@observable_compiler{
rule:"tout_concept_doît_être_compilé_en_indices_observables";
fence:"concept_sans_observable→symbole_générique_probable";
}
```

### M09 · `observable_compiler` · RULE · lignes 40-40
- source_key: `rule`
- projection_id: `RULE.M09.OBSERVABLE_COMPILER.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"tout_concept_doît_être_compilé_en_indices_observables";
```

### M09 · `observable_compiler` · RULE · lignes 41-41
- source_key: `fence`
- projection_id: `RULE.M09.OBSERVABLE_COMPILER.FENCE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
fence:"concept_sans_observable→symbole_générique_probable";
```

### M10 · `verb_test` · SCHEMA · lignes 86-89
- source_key: `@block`
- projection_id: `SRCFRAG.M10.VERB_TEST`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@verb_test{
verbs:["choisir","tromper","refuser","apprendre","communiquer","se_souvenir","décider","faciliter","sécuriser","déplacer"];
run:["description_observable","éléments_constitutifs","réintroduire_verbe_si_traces"];
}
```

### M10 · `verb_test` · SCHEMA · lignes 87-87
- source_key: `verbs`
- projection_id: `SCHEMA.M10.VERB_TEST.VERBS`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
verbs:["choisir","tromper","refuser","apprendre","communiquer","se_souvenir","décider","faciliter","sécuriser","déplacer"];
```

### M10 · `verb_test` · PROCEDURE · lignes 88-88
- source_key: `run`
- projection_id: `PROC.M10.VERB_TEST.RUN`
- semantic_role: `run_sequence`
- a2_role: `ordered_procedure`
- a2_confidence: `high`

```text
run:["description_observable","éléments_constitutifs","réintroduire_verbe_si_traces"];
```
