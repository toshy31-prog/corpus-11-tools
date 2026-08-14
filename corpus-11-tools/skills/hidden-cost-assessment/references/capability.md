# CAP.HIDDEN_COST_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 2,3,15
- rationale: Même mécanisme: sortie stable pouvant masquer coût/compensation accrus.


## Relations pertinentes du graphe 11.x

- `CAP.HIDDEN_COST_ASSESSMENT --supports[optional]--> CAP.FIELD_CAPACITY_ASSESSMENT`
- `CAP.REAL_TRANSFORMATION_ASSESSMENT --uses[contextual]--> CAP.HIDDEN_COST_ASSESSMENT`


## Backlinks 10.x

### M02 · `performance_cost_test` · SCHEMA · lignes 108-111
- source_key: `@block`
- projection_id: `SRCFRAG.M02.PERFORMANCE_COST_TEST`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@performance_cost_test{
require:[sortie,temps,énergie,attention,risque,compensation,porteur,histoire_d_exposition,trace_après_retrait];
rule:"performance_identique≠capacité_inchangée;coût_sans_porteur_ni_observable→non_établi";
}
```

### M02 · `performance_cost_test` · SCHEMA · lignes 109-109
- source_key: `require`
- projection_id: `SCHEMA.M02.PERFORMANCE_COST_TEST.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[sortie,temps,énergie,attention,risque,compensation,porteur,histoire_d_exposition,trace_après_retrait];
```

### M02 · `performance_cost_test` · RULE · lignes 110-110
- source_key: `rule`
- projection_id: `RULE.M02.PERFORMANCE_COST_TEST.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `compound_unresolved`
- a2_confidence: `unresolved`

```text
rule:"performance_identique≠capacité_inchangée;coût_sans_porteur_ni_observable→non_établi";
```

### M03 · `hidden_load` · SCHEMA · lignes 64-67
- source_key: `@block`
- projection_id: `SRCFRAG.M03.HIDDEN_LOAD`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@hidden_load{
fields:[acteur,fonction,sortie,temps,énergie,attention,risque,compensation,trace];
rule:"sortie_constante+coût_accru→capacité_nette_diminuée";
}
```

### M03 · `hidden_load` · SCHEMA · lignes 65-65
- source_key: `fields`
- projection_id: `SCHEMA.M03.HIDDEN_LOAD.FIELDS`
- semantic_role: `declared_structure`
- a2_role: `nan`
- a2_confidence: `nan`

```text
fields:[acteur,fonction,sortie,temps,énergie,attention,risque,compensation,trace];
```

### M03 · `hidden_load` · RULE · lignes 66-66
- source_key: `rule`
- projection_id: `RULE.M03.HIDDEN_LOAD.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"sortie_constante+coût_accru→capacité_nette_diminuée";
```

### M15 · `hidden_cost` · SCHEMA · lignes 13-21
- source_key: `@block`
- projection_id: `SRCFRAG.M15.HIDDEN_COST`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@hidden_cost{
fields:[sortie,temps,énergie,attention,risque,compensation,porteur,trace_après_retrait];
rules:[
"performance_identique≠coût_identique";
"compensation_réussie_peut_masquer_dommage";
"retrait_perturbation≠effacement_traces";
"coût_sans_porteur,observable_ou_comparateur→non_établi";
];
}
```

### M15 · `hidden_cost` · SCHEMA · lignes 14-14
- source_key: `fields`
- projection_id: `SCHEMA.M15.HIDDEN_COST.FIELDS`
- semantic_role: `declared_structure`
- a2_role: `nan`
- a2_confidence: `nan`

```text
fields:[sortie,temps,énergie,attention,risque,compensation,porteur,trace_après_retrait];
```

### M15 · `hidden_cost` · RULE · lignes 15-20
- source_key: `rules[0]`
- projection_id: `RULE.M15.HIDDEN_COST.RULES_01`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"performance_identique≠coût_identique";
"compensation_réussie_peut_masquer_dommage";
"retrait_perturbation≠effacement_traces";
"coût_sans_porteur,observable_ou_comparateur→non_établi";
];
```

### M15 · `hidden_cost` · RULE · lignes 15-20
- source_key: `rules[1]`
- projection_id: `RULE.M15.HIDDEN_COST.RULES_02`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"performance_identique≠coût_identique";
"compensation_réussie_peut_masquer_dommage";
"retrait_perturbation≠effacement_traces";
"coût_sans_porteur,observable_ou_comparateur→non_établi";
];
```

### M15 · `hidden_cost` · RULE · lignes 15-20
- source_key: `rules[2]`
- projection_id: `RULE.M15.HIDDEN_COST.RULES_03`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"performance_identique≠coût_identique";
"compensation_réussie_peut_masquer_dommage";
"retrait_perturbation≠effacement_traces";
"coût_sans_porteur,observable_ou_comparateur→non_établi";
];
```

### M15 · `hidden_cost` · RULE · lignes 15-20
- source_key: `rules[3]`
- projection_id: `RULE.M15.HIDDEN_COST.RULES_04`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rules:[
"performance_identique≠coût_identique";
"compensation_réussie_peut_masquer_dommage";
"retrait_perturbation≠effacement_traces";
"coût_sans_porteur,observable_ou_comparateur→non_établi";
];
```
