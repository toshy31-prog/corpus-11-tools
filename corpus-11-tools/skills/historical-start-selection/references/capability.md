# CAP.HISTORICAL_START_SELECTION — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 8,10,16
- rationale: Choisir/tester un début historique adéquat est distinct de détecter une régression de cadrage après coup.


## Relations pertinentes du graphe 11.x

- `CAP.FRAMING_REGRESSION_DETECTION --related_but_distinct[contextual]--> CAP.HISTORICAL_START_SELECTION`
- `CAP.HISTORICAL_START_SELECTION --uses[contextual]--> CAP.FRAMING_REGRESSION_DETECTION`
- `CAP.OCCUPATION_QUALIFICATION --requires[critical]--> CAP.HISTORICAL_START_SELECTION`


## Backlinks 10.x

### M08 · `start_selection` · SCHEMA · lignes 14-23
- source_key: `@block`
- projection_id: `SRCFRAG.M08.START_SELECTION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@start_selection{
ask:[
"où_commence_le_récit?";
"qui_devient_cause,réaction_ou_contexte?";
"quel_ordre_installé_est_naturalisé?";
"quel_acte_présent_risque_d_être_dissous_par_histoire_longue?";
"quels_autres_débuts_changeraient_attribution?";
];
rule:"commencer_assez_tôt_pour_rendre_rapport_de_pouvoir_intelligible;revenir_aux_actes_sans_immunité";
}
```

### M08 · `start_selection` · SCHEMA · lignes 15-21
- source_key: `ask`
- projection_id: `SCHEMA.M08.START_SELECTION.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"où_commence_le_récit?";
"qui_devient_cause,réaction_ou_contexte?";
"quel_ordre_installé_est_naturalisé?";
"quel_acte_présent_risque_d_être_dissous_par_histoire_longue?";
"quels_autres_débuts_changeraient_attribution?";
];
```

### M08 · `start_selection` · RULE · lignes 22-22
- source_key: `rule`
- projection_id: `RULE.M08.START_SELECTION.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"commencer_assez_tôt_pour_rendre_rapport_de_pouvoir_intelligible;revenir_aux_actes_sans_immunité";
```

### M08 · `history_layers` · SCHEMA · lignes 25-37
- source_key: `@block`
- projection_id: `SRCFRAG.M08.HISTORY_LAYERS`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@history_layers{
run:[
"formations_sociales_avant_catégories_actuelles";
"puissances_impériales_et_infrastructures";
"terre,travail,corps,famille,temps,mobilité";
"institutions_et_asymétries_accumulées";
"ruptures,guerres,déplacements,non-retours";
"résistances,entraides,savoirs,créations";
"ordre_actuel_et_capacités";
"acte_récent";
];
fence:"ne_pas_projeter_entités_contemporaines_intactes_dans_passé";
}
```

### M08 · `history_layers` · PROCEDURE · lignes 26-35
- source_key: `run`
- projection_id: `PROC.M08.HISTORY_LAYERS.RUN`
- semantic_role: `run_sequence`
- a2_role: `ordered_procedure`
- a2_confidence: `high`

```text
run:[
"formations_sociales_avant_catégories_actuelles";
"puissances_impériales_et_infrastructures";
"terre,travail,corps,famille,temps,mobilité";
"institutions_et_asymétries_accumulées";
"ruptures,guerres,déplacements,non-retours";
"résistances,entraides,savoirs,créations";
"ordre_actuel_et_capacités";
"acte_récent";
];
```

### M08 · `history_layers` · RULE · lignes 36-36
- source_key: `fence`
- projection_id: `RULE.M08.HISTORY_LAYERS.FENCE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
fence:"ne_pas_projeter_entités_contemporaines_intactes_dans_passé";
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
