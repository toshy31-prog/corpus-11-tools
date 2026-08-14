# CAP.FRAMING_REGRESSION_DETECTION — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 6,8,10,16
- rationale: Même mécanisme: élément structurant apparaissant trop tard et modifiant cadrage/prise.


## Relations pertinentes du graphe 11.x

- `CAP.FRAMING_REGRESSION_DETECTION --related_but_distinct[contextual]--> CAP.HISTORICAL_START_SELECTION`
- `CAP.HISTORICAL_START_SELECTION --uses[contextual]--> CAP.FRAMING_REGRESSION_DETECTION`
- `CAP.FICTION_MECHANISM_TRANSFORMATION --uses[contextual]--> CAP.FRAMING_REGRESSION_DETECTION`


## Backlinks 10.x

### M06 · `late_arrival_probe` · SCHEMA · lignes 38-45
- source_key: `@block`
- projection_id: `SRCFRAG.M06.LATE_ARRIVAL_PROBE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@late_arrival_probe{
ask:[
"quel_élément_user_a-t-il_dû_forcer?";
"devait-il_structurer_la_scène_initiale?";
"quelle_source,langue_ou_position_l_a_rendu_tardif?";
];
rule:"cause_structurante_tardive→reprendre_scène,non_simple_ajout";
}
```

### M06 · `late_arrival_probe` · SCHEMA · lignes 39-43
- source_key: `ask`
- projection_id: `SCHEMA.M06.LATE_ARRIVAL_PROBE.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"quel_élément_user_a-t-il_dû_forcer?";
"devait-il_structurer_la_scène_initiale?";
"quelle_source,langue_ou_position_l_a_rendu_tardif?";
];
```

### M06 · `late_arrival_probe` · RULE · lignes 44-44
- source_key: `rule`
- projection_id: `RULE.M06.LATE_ARRIVAL_PROBE.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"cause_structurante_tardive→reprendre_scène,non_simple_ajout";
```

### M08 · `late_arrival_regression` · SCHEMA · lignes 39-47
- source_key: `@block`
- projection_id: `SRCFRAG.M08.LATE_ARRIVAL_REGRESSION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@late_arrival_regression{
trigger:"user_doît_pousser_pour_cause_structurante";
ask:[
"devait-elle_figurer_dans_première_scène?";
"quelle_route_ou_source_l_a_retardée?";
"quelle_conclusion_initiale_change?";
];
rule:"si_oui→réécrire_depuis_début;ajout_tardif_seul=échec";
}
```

### M08 · `late_arrival_regression` · SCHEMA · lignes 40-40
- source_key: `trigger`
- projection_id: `SCHEMA.M08.LATE_ARRIVAL_REGRESSION.TRIGGER`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
trigger:"user_doît_pousser_pour_cause_structurante";
```

### M08 · `late_arrival_regression` · SCHEMA · lignes 41-45
- source_key: `ask`
- projection_id: `SCHEMA.M08.LATE_ARRIVAL_REGRESSION.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"devait-elle_figurer_dans_première_scène?";
"quelle_route_ou_source_l_a_retardée?";
"quelle_conclusion_initiale_change?";
];
```

### M08 · `late_arrival_regression` · RULE · lignes 46-46
- source_key: `rule`
- projection_id: `RULE.M08.LATE_ARRIVAL_REGRESSION.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `compound_unresolved`
- a2_confidence: `unresolved`

```text
rule:"si_oui→réécrire_depuis_début;ajout_tardif_seul=échec";
```

### M10 · `framing_drill` · SCHEMA · lignes 60-72
- source_key: `@block`
- projection_id: `SRCFRAG.M10.FRAMING_DRILL`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@framing_drill{
run:[
"figer_faits";
"permuter_point_de_départ";
"permuter_sujet_grammatical";
"remplacer_passif_par_acteur_si_établi";
"retirer_histoire_longue";
"retirer_acte_récent";
"observer_attribution,protection,recours";
"identifier_ce_que_user_a_dû_forcer";
];
rule:"cause_structurante_apparaissant_seulement_après_permutation→régression_de_cadrage";
}
```

### M10 · `framing_drill` · PROCEDURE · lignes 61-70
- source_key: `run`
- projection_id: `PROC.M10.FRAMING_DRILL.RUN`
- semantic_role: `run_sequence`
- a2_role: `ordered_procedure`
- a2_confidence: `high`

```text
run:[
"figer_faits";
"permuter_point_de_départ";
"permuter_sujet_grammatical";
"remplacer_passif_par_acteur_si_établi";
"retirer_histoire_longue";
"retirer_acte_récent";
"observer_attribution,protection,recours";
"identifier_ce_que_user_a_dû_forcer";
];
```

### M10 · `framing_drill` · RULE · lignes 71-71
- source_key: `rule`
- projection_id: `RULE.M10.FRAMING_DRILL.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"cause_structurante_apparaissant_seulement_après_permutation→régression_de_cadrage";
```

### M16 · `late_arrival_test` · SCHEMA · lignes 140-147
- source_key: `@block`
- projection_id: `SRCFRAG.M16.LATE_ARRIVAL_TEST`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@late_arrival_test{
ask:[
"qu_est-ce_que_user_a_dû_forcer?";
"pourquoi_sources/modèle/corpus_l_ont_rendu_tardif?";
"doît-on_reconstruire_scène?";
];
rule:"élément_structurant_tardif→régression,non_bonus_de_profondeur";
}
```

### M16 · `late_arrival_test` · SCHEMA · lignes 141-145
- source_key: `ask`
- projection_id: `SCHEMA.M16.LATE_ARRIVAL_TEST.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"qu_est-ce_que_user_a_dû_forcer?";
"pourquoi_sources/modèle/corpus_l_ont_rendu_tardif?";
"doît-on_reconstruire_scène?";
];
```

### M16 · `late_arrival_test` · RULE · lignes 146-146
- source_key: `rule`
- projection_id: `RULE.M16.LATE_ARRIVAL_TEST.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"élément_structurant_tardif→régression,non_bonus_de_profondeur";
```
