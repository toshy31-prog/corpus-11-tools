# CAP.REAL_TRANSFORMATION_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain_general
- modules sources: 3,5,17
- rationale: Noyau commun sur capacités/coûts/recours/traces; critères de pouvoir restent spécialisés.


## Relations pertinentes du graphe 11.x

- `CAP.REAL_TRANSFORMATION_ASSESSMENT --supports_specialization[contextual]--> CAP.AUTONOMOUS_CAPACITY_GAIN`
- `CAP.REAL_TRANSFORMATION_ASSESSMENT --uses[contextual]--> CAP.HIDDEN_COST_ASSESSMENT`
- `CAP.REAL_TRANSFORMATION_ASSESSMENT --has_specialization[structural]--> CAP.AUTONOMOUS_CAPACITY_GAIN`
- `CAP.REPAIR_SUFFICIENCY --uses[critical]--> CAP.REAL_TRANSFORMATION_ASSESSMENT`
- `CAP.PRIVILEGE_CONVERSION_ASSESSMENT --uses[contextual]--> CAP.REAL_TRANSFORMATION_ASSESSMENT`


## Backlinks 10.x

### M03 · `real_power_loss` · SCHEMA · lignes 79-81
- source_key: `@block`
- projection_id: `SRCFRAG.M03.REAL_POWER_LOSS`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@real_power_loss{
rule:"limite_effective_seulement_si_capacité_devient_indisponible,conditionnelle,plus_coûteuse_ou_non_transmissible";
}
```

### M03 · `real_power_loss` · RULE · lignes 80-80
- source_key: `rule`
- projection_id: `RULE.M03.REAL_POWER_LOSS.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"limite_effective_seulement_si_capacité_devient_indisponible,conditionnelle,plus_coûteuse_ou_non_transmissible";
```

### M05 · `real_delta` · SCHEMA · lignes 6-14
- source_key: `@block`
- projection_id: `SRCFRAG.M05.REAL_DELTA`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@real_delta{
formula:"Δréel=Δκ−Δχ+Δρ+Δτ−↺−ω_nié";
rules:[
"Δréel=0→transformation_rhétorique";
"Δréel<0→amélioration_apparente_domination_accrue";
"Δréel>0+π_absent→gain_sans_justice";
"gain_de_conscience_sans_gain_de_capacité→diagnostic_sans_transformation";
]
}
```

### M05 · `real_delta` · SCHEMA · lignes 7-7
- source_key: `formula`
- projection_id: `SCHEMA.M05.REAL_DELTA.FORMULA`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
formula:"Δréel=Δκ−Δχ+Δρ+Δτ−↺−ω_nié";
```

### M05 · `real_delta` · RULE · lignes 8-14
- source_key: `rules[0]`
- projection_id: `RULE.M05.REAL_DELTA.RULES_01`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rules:[
"Δréel=0→transformation_rhétorique";
"Δréel<0→amélioration_apparente_domination_accrue";
"Δréel>0+π_absent→gain_sans_justice";
"gain_de_conscience_sans_gain_de_capacité→diagnostic_sans_transformation";
]
}
```

### M05 · `real_delta` · RULE · lignes 8-14
- source_key: `rules[1]`
- projection_id: `RULE.M05.REAL_DELTA.RULES_02`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rules:[
"Δréel=0→transformation_rhétorique";
"Δréel<0→amélioration_apparente_domination_accrue";
"Δréel>0+π_absent→gain_sans_justice";
"gain_de_conscience_sans_gain_de_capacité→diagnostic_sans_transformation";
]
}
```

### M05 · `real_delta` · RULE · lignes 8-14
- source_key: `rules[2]`
- projection_id: `RULE.M05.REAL_DELTA.RULES_03`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rules:[
"Δréel=0→transformation_rhétorique";
"Δréel<0→amélioration_apparente_domination_accrue";
"Δréel>0+π_absent→gain_sans_justice";
"gain_de_conscience_sans_gain_de_capacité→diagnostic_sans_transformation";
]
}
```

### M05 · `real_delta` · RULE · lignes 8-14
- source_key: `rules[3]`
- projection_id: `RULE.M05.REAL_DELTA.RULES_04`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rules:[
"Δréel=0→transformation_rhétorique";
"Δréel<0→amélioration_apparente_domination_accrue";
"Δréel>0+π_absent→gain_sans_justice";
"gain_de_conscience_sans_gain_de_capacité→diagnostic_sans_transformation";
]
}
```

### M05 · `autonomous_capacity_gain` · SCHEMA · lignes 48-62
- source_key: `@block`
- projection_id: `SRCFRAG.M05.AUTONOMOUS_CAPACITY_GAIN`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@autonomous_capacity_gain{
include:[
"capacité_de_détecter";
"contester";
"bloquer";
"sanctionner";
"réparer";
"archiver";
"contre-expertiser";
"financer_collectivement";
"transmettre";
"empêcher_réactivation";
];
rule:"transformation_réelle=perte_de_capacité_dominante_et/ou_gain_autonome_non_dépendant";
}
```

### M05 · `autonomous_capacity_gain` · SCHEMA · lignes 49-60
- source_key: `include`
- projection_id: `SCHEMA.M05.AUTONOMOUS_CAPACITY_GAIN.INCLUDE`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
include:[
"capacité_de_détecter";
"contester";
"bloquer";
"sanctionner";
"réparer";
"archiver";
"contre-expertiser";
"financer_collectivement";
"transmettre";
"empêcher_réactivation";
];
```

### M05 · `autonomous_capacity_gain` · RULE · lignes 61-61
- source_key: `rule`
- projection_id: `RULE.M05.AUTONOMOUS_CAPACITY_GAIN.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"transformation_réelle=perte_de_capacité_dominante_et/ou_gain_autonome_non_dépendant";
```

### M05 · `local_irreversibility` · SCHEMA · lignes 64-80
- source_key: `@block`
- projection_id: `SRCFRAG.M05.LOCAL_IRREVERSIBILITY`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@local_irreversibility{
fields:[
"acteur";
"niveau_de_capacité";
"type_de_continuité";
"état_restaurable";
"relation_et_histoire_non_restaurées";
"coût,délai,canal_du_retour";
"porteurs_de_savoir";
"phase,rythme,règle_de_reprise";
"monde_relationnel";
];
rules:[
"réversibilité_technique≠restauration_totale";
"irréversible_pour_un_acteur_peut_être_réversible_pour_plus_puissant";
]
}
```

### M05 · `local_irreversibility` · SCHEMA · lignes 65-75
- source_key: `fields`
- projection_id: `SCHEMA.M05.LOCAL_IRREVERSIBILITY.FIELDS`
- semantic_role: `declared_structure`
- a2_role: `nan`
- a2_confidence: `nan`

```text
fields:[
"acteur";
"niveau_de_capacité";
"type_de_continuité";
"état_restaurable";
"relation_et_histoire_non_restaurées";
"coût,délai,canal_du_retour";
"porteurs_de_savoir";
"phase,rythme,règle_de_reprise";
"monde_relationnel";
];
```

### M05 · `local_irreversibility` · RULE · lignes 76-80
- source_key: `rules[0]`
- projection_id: `RULE.M05.LOCAL_IRREVERSIBILITY.RULES_01`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"réversibilité_technique≠restauration_totale";
"irréversible_pour_un_acteur_peut_être_réversible_pour_plus_puissant";
]
}
```

### M05 · `local_irreversibility` · RULE · lignes 76-80
- source_key: `rules[1]`
- projection_id: `RULE.M05.LOCAL_IRREVERSIBILITY.RULES_02`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"réversibilité_technique≠restauration_totale";
"irréversible_pour_un_acteur_peut_être_réversible_pour_plus_puissant";
]
}
```

### M17 · `real_transformation` · SCHEMA · lignes 68-76
- source_key: `@block`
- projection_id: `SRCFRAG.M17.REAL_TRANSFORMATION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@real_transformation{
ask:[
"quelle_capacité_réelle_retirée_aux_dominants?";
"quelle_capacité_autonome_créée_chez_dominés?";
"opération_devient-elle_détectable,contestable,bloquable,réversible,coûteuse?";
"ancien_ordre_peut-il_revenir_sous_autre_nom?";
];
rule:"aucune_perte_dominante+aucun_gain_autonome→transformation_symbolique_probable";
}
```

### M17 · `real_transformation` · SCHEMA · lignes 69-74
- source_key: `ask`
- projection_id: `SCHEMA.M17.REAL_TRANSFORMATION.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"quelle_capacité_réelle_retirée_aux_dominants?";
"quelle_capacité_autonome_créée_chez_dominés?";
"opération_devient-elle_détectable,contestable,bloquable,réversible,coûteuse?";
"ancien_ordre_peut-il_revenir_sous_autre_nom?";
];
```

### M17 · `real_transformation` · RULE · lignes 75-75
- source_key: `rule`
- projection_id: `RULE.M17.REAL_TRANSFORMATION.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"aucune_perte_dominante+aucun_gain_autonome→transformation_symbolique_probable";
```
