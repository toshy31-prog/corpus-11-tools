# CAP.CONSCIOUSNESS_EVIDENCE_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain_composite
- modules sources: 7,2,15
- rationale: Composition spécifique de preuve positive, non-attribution et précaution; ne se réduit pas au parent attribution.


## Relations pertinentes du graphe 11.x

- `FAM.ATTRIBUTION_GROUNDING --specialization[contextual]--> CAP.CONSCIOUSNESS_EVIDENCE_ASSESSMENT`
- `CAP.CONSCIOUSNESS_EVIDENCE_ASSESSMENT --requires[critical]--> CAP.DETECTABILITY_ASSESSMENT`
- `CAP.CONSCIOUSNESS_EVIDENCE_ASSESSMENT --uses[critical]--> CAP.PROTOCOL_ROBUSTNESS`


## Backlinks 10.x

### M02 · `non_attribution` · SCHEMA · lignes 142-145
- source_key: `@block`
- projection_id: `SRCFRAG.M02.NON_ATTRIBUTION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@non_attribution{
rule:"signal,trace,archive,comportement,corrélation,auto-modèle,refus_produit,avatar,opacité_ou_complexité_ne_valent_pas_seuls_identité,intention,consentement,conscience_ou_expérience";
fence:"non-attribution≠présomption_négative_illimitée";
}
```

### M02 · `non_attribution` · RULE · lignes 143-143
- source_key: `rule`
- projection_id: `RULE.M02.NON_ATTRIBUTION.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"signal,trace,archive,comportement,corrélation,auto-modèle,refus_produit,avatar,opacité_ou_complexité_ne_valent_pas_seuls_identité,intention,consentement,conscience_ou_expérience";
```

### M02 · `non_attribution` · RULE · lignes 144-144
- source_key: `fence`
- projection_id: `RULE.M02.NON_ATTRIBUTION.FENCE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
fence:"non-attribution≠présomption_négative_illimitée";
```

### M07 · `research_protection_split` · SCHEMA · lignes 20-32
- source_key: `@block`
- projection_id: `SRCFRAG.M07.RESEARCH_PROTECTION_SPLIT`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@research_protection_split{
research:[
"modèles_concurrents";
"prédictions_différentes";
"tests_minimaux";
"critères_contre_hypothèse";
"effets_protocole";
"tests_multi-canaux";
"pertes_préspécifiées";
];
protection:["limites_préventives","interdiction_tests_nocifs","suspension","traçabilité","réversibilité","recours"];
rule:"protéger_n_est_pas_affirmer;douter_n_est_pas_autoriser_sans_limite";
}
```

### M07 · `research_protection_split` · SCHEMA · lignes 21-29
- source_key: `research`
- projection_id: `SCHEMA.M07.RESEARCH_PROTECTION_SPLIT.RESEARCH`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
research:[
"modèles_concurrents";
"prédictions_différentes";
"tests_minimaux";
"critères_contre_hypothèse";
"effets_protocole";
"tests_multi-canaux";
"pertes_préspécifiées";
];
```

### M07 · `research_protection_split` · SCHEMA · lignes 30-30
- source_key: `protection`
- projection_id: `SCHEMA.M07.RESEARCH_PROTECTION_SPLIT.PROTECTION`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
protection:["limites_préventives","interdiction_tests_nocifs","suspension","traçabilité","réversibilité","recours"];
```

### M07 · `research_protection_split` · RULE · lignes 31-31
- source_key: `rule`
- projection_id: `RULE.M07.RESEARCH_PROTECTION_SPLIT.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"protéger_n_est_pas_affirmer;douter_n_est_pas_autoriser_sans_limite";
```

### M07 · `positive_evidence` · SCHEMA · lignes 38-47
- source_key: `@block`
- projection_id: `SRCFRAG.M07.POSITIVE_EVIDENCE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@positive_evidence{
require:[
"convergence_multi-indices";
"indépendance_relative";
"portabilité_contextuelle";
"résistance_aux_explications_concurrentes";
"mécanisme_plausible";
];
rule:"aucun_signe_isolé_ne_suffit;incertitude_ne_devient_pas_certitude_négative";
}
```

### M07 · `positive_evidence` · SCHEMA · lignes 39-45
- source_key: `require`
- projection_id: `SCHEMA.M07.POSITIVE_EVIDENCE.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[
"convergence_multi-indices";
"indépendance_relative";
"portabilité_contextuelle";
"résistance_aux_explications_concurrentes";
"mécanisme_plausible";
];
```

### M07 · `positive_evidence` · RULE · lignes 46-46
- source_key: `rule`
- projection_id: `RULE.M07.POSITIVE_EVIDENCE.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"aucun_signe_isolé_ne_suffit;incertitude_ne_devient_pas_certitude_négative";
```

### M15 · `nonhuman_precaution` · SCHEMA · lignes 74-82
- source_key: `@block`
- projection_id: `SRCFRAG.M15.NONHUMAN_PRECAUTION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@nonhuman_precaution{
rules:[
"échec_test_humain→absence_capacité_non_établie";
"coordination_collective≠conscience_collective";
"signal_informatif≠intention_communiquer";
"ni_anthropomorphisme_ni_réduction";
"protection_peut_s_appuyer_sur_capacité_et_dommage_sans_subjectivité";
];
}
```

### M15 · `nonhuman_precaution` · RULE · lignes 75-81
- source_key: `rules[0]`
- projection_id: `RULE.M15.NONHUMAN_PRECAUTION.RULES_01`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rules:[
"échec_test_humain→absence_capacité_non_établie";
"coordination_collective≠conscience_collective";
"signal_informatif≠intention_communiquer";
"ni_anthropomorphisme_ni_réduction";
"protection_peut_s_appuyer_sur_capacité_et_dommage_sans_subjectivité";
];
```

### M15 · `nonhuman_precaution` · RULE · lignes 75-81
- source_key: `rules[1]`
- projection_id: `RULE.M15.NONHUMAN_PRECAUTION.RULES_02`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"échec_test_humain→absence_capacité_non_établie";
"coordination_collective≠conscience_collective";
"signal_informatif≠intention_communiquer";
"ni_anthropomorphisme_ni_réduction";
"protection_peut_s_appuyer_sur_capacité_et_dommage_sans_subjectivité";
];
```

### M15 · `nonhuman_precaution` · RULE · lignes 75-81
- source_key: `rules[2]`
- projection_id: `RULE.M15.NONHUMAN_PRECAUTION.RULES_03`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"échec_test_humain→absence_capacité_non_établie";
"coordination_collective≠conscience_collective";
"signal_informatif≠intention_communiquer";
"ni_anthropomorphisme_ni_réduction";
"protection_peut_s_appuyer_sur_capacité_et_dommage_sans_subjectivité";
];
```

### M15 · `nonhuman_precaution` · RULE · lignes 75-81
- source_key: `rules[3]`
- projection_id: `RULE.M15.NONHUMAN_PRECAUTION.RULES_04`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"échec_test_humain→absence_capacité_non_établie";
"coordination_collective≠conscience_collective";
"signal_informatif≠intention_communiquer";
"ni_anthropomorphisme_ni_réduction";
"protection_peut_s_appuyer_sur_capacité_et_dommage_sans_subjectivité";
];
```

### M15 · `nonhuman_precaution` · RULE · lignes 75-81
- source_key: `rules[4]`
- projection_id: `RULE.M15.NONHUMAN_PRECAUTION.RULES_05`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"échec_test_humain→absence_capacité_non_établie";
"coordination_collective≠conscience_collective";
"signal_informatif≠intention_communiquer";
"ni_anthropomorphisme_ni_réduction";
"protection_peut_s_appuyer_sur_capacité_et_dommage_sans_subjectivité";
];
```
