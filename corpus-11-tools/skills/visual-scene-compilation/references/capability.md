# CAP.VISUAL_SCENE_COMPILATION — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain_composite
- modules sources: 9
- rationale: Compilation de scène vers IR visuel avec position/source/observables; distincte de l'IR lui-même.


## Relations pertinentes du graphe 11.x

- `CAP.VISUAL_SCENE_COMPILATION --requires[critical]--> CAP.OBSERVABLE_COMPILATION`
- `CAP.VISUAL_SCENE_COMPILATION --uses[contextual]--> CAP.SOURCE_ENVIRONMENT_ASSESSMENT`


## Backlinks 10.x

### M09 · `pipeline` · SCHEMA · lignes 5-7
- source_key: `@block`
- projection_id: `SRCFRAG.M09.PIPELINE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@pipeline{
run:"Request→Scene+PositionPreservation→Explicit/Inferred/Defaulted→FidelityTargets→MediumTest→VisualIR→PromptHypotheses→GeneratePopulation?→BlindAudit→SourceRegimeAudit→Counterfield→SelectOrPlural→Trace";
}
```

### M09 · `pipeline` · PROCEDURE · lignes 6-6
- source_key: `run`
- projection_id: `PROC.M09.PIPELINE.RUN`
- semantic_role: `run_sequence`
- a2_role: `ordered_procedure`
- a2_confidence: `high`

```text
run:"Request→Scene+PositionPreservation→Explicit/Inferred/Defaulted→FidelityTargets→MediumTest→VisualIR→PromptHypotheses→GeneratePopulation?→BlindAudit→SourceRegimeAudit→Counterfield→SelectOrPlural→Trace";
```

### M09 · `medium_test` · SCHEMA · lignes 21-28
- source_key: `@block`
- projection_id: `SRCFRAG.M09.MEDIUM_TEST`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@medium_test{
route:[
"état_visible→image_unique";
"transformation→diptyque";
"durée,retour,histoire→séquence";
"interaction_continue→vidéo_ou_animation";
];
}
```

### M09 · `medium_test` · SCHEMA · lignes 22-27
- source_key: `route`
- projection_id: `SCHEMA.M09.MEDIUM_TEST.ROUTE`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
route:[
"état_visible→image_unique";
"transformation→diptyque";
"durée,retour,histoire→séquence";
"interaction_continue→vidéo_ou_animation";
];
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

### M09 · `prompt_hypotheses` · SCHEMA · lignes 44-47
- source_key: `@block`
- projection_id: `SRCFRAG.M09.PROMPT_HYPOTHESES`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@prompt_hypotheses{
require:"si_enjeu_ouvert,2_ou_3_compilations_structurellement_incompatibles";
types:["documentaire_concret","matériel_causal","symbolique_assumé","non_figuratif_relationnel"];
}
```

### M09 · `prompt_hypotheses` · SCHEMA · lignes 45-45
- source_key: `require`
- projection_id: `SCHEMA.M09.PROMPT_HYPOTHESES.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `obligation`
- a2_confidence: `medium`

```text
require:"si_enjeu_ouvert,2_ou_3_compilations_structurellement_incompatibles";
```

### M09 · `prompt_hypotheses` · SCHEMA · lignes 46-46
- source_key: `types`
- projection_id: `SCHEMA.M09.PROMPT_HYPOTHESES.TYPES`
- semantic_role: `declared_structure`
- a2_role: `nan`
- a2_confidence: `nan`

```text
types:["documentaire_concret","matériel_causal","symbolique_assumé","non_figuratif_relationnel"];
```
