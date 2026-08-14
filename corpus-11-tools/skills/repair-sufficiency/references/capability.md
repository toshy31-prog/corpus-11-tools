# CAP.REPAIR_SUFFICIENCY — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain_composite
- modules sources: 4,5,8,17
- rationale: La réparation exige dette/perte/porteurs/recours/non-répétition; ne fusionne pas avec transformation réelle.


## Relations pertinentes du graphe 11.x

- `CAP.REPAIR_SUFFICIENCY --uses[critical]--> CAP.REAL_TRANSFORMATION_ASSESSMENT`
- `CAP.REPAIR_SUFFICIENCY --uses[contextual]--> CAP.NON_LOCAL_DEBT_ASSESSMENT`


## Backlinks 10.x

### M04 · `access_restitution` · SCHEMA · lignes 43-46
- source_key: `@block`
- projection_id: `SRCFRAG.M04.ACCESS_RESTITUTION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@access_restitution{
require:["retirer_autorisations","fermer_canaux","tester_perte_de_capacité","déclarer_copies_inconnues","conserver_recours","empêcher_réactivation_solitaire"];
rule:"restitution_déclarée≠restitution_effective";
}
```

### M04 · `access_restitution` · SCHEMA · lignes 44-44
- source_key: `require`
- projection_id: `SCHEMA.M04.ACCESS_RESTITUTION.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `obligation`
- a2_confidence: `medium`

```text
require:["retirer_autorisations","fermer_canaux","tester_perte_de_capacité","déclarer_copies_inconnues","conserver_recours","empêcher_réactivation_solitaire"];
```

### M04 · `access_restitution` · RULE · lignes 45-45
- source_key: `rule`
- projection_id: `RULE.M04.ACCESS_RESTITUTION.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"restitution_déclarée≠restitution_effective";
```

### M04 · `repair` · SCHEMA · lignes 48-62
- source_key: `@block`
- projection_id: `SRCFRAG.M04.REPAIR`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@repair{
states:[symbolique,documentaire,matérielle,territoriale,corporelle,relationnelle,institutionnelle];
require:[
"perte";
"porteurs";
"acteur_responsable_ou_bénéficiaire_capable";
"transfert";
"recours";
"non_répétition";
"condition_de_clôture";
"monde_nécessaire_à_l_usage";
"reste_irréparable_nommé";
];
rule:"réparation_ne_requiert_pas_identique;objet_restitué≠capacité_d_usage_restituée";
}
```

### M04 · `repair` · SCHEMA · lignes 49-49
- source_key: `states`
- projection_id: `SCHEMA.M04.REPAIR.STATES`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
states:[symbolique,documentaire,matérielle,territoriale,corporelle,relationnelle,institutionnelle];
```

### M04 · `repair` · SCHEMA · lignes 50-60
- source_key: `require`
- projection_id: `SCHEMA.M04.REPAIR.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[
"perte";
"porteurs";
"acteur_responsable_ou_bénéficiaire_capable";
"transfert";
"recours";
"non_répétition";
"condition_de_clôture";
"monde_nécessaire_à_l_usage";
"reste_irréparable_nommé";
];
```

### M04 · `repair` · RULE · lignes 61-61
- source_key: `rule`
- projection_id: `RULE.M04.REPAIR.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"réparation_ne_requiert_pas_identique;objet_restitué≠capacité_d_usage_restituée";
```

### M04 · `repair_sufficiency` · SCHEMA · lignes 64-72
- source_key: `@block`
- projection_id: `SRCFRAG.M04.REPAIR_SUFFICIENCY`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@repair_sufficiency{
require_any:[
"capacité_retrouvée_ou_compensée";
"recours_effectif";
"risque_de_répétition_réduit";
"reste_irréparable_reconnu";
];
fence:"monde_nécessaire_à_l_usage_ne_doît_pas_rendre_dette_infinie_sans_critère_de_clôture";
}
```

### M04 · `repair_sufficiency` · SCHEMA · lignes 65-70
- source_key: `require_any`
- projection_id: `SCHEMA.M04.REPAIR_SUFFICIENCY.REQUIRE_ANY`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require_any:[
"capacité_retrouvée_ou_compensée";
"recours_effectif";
"risque_de_répétition_réduit";
"reste_irréparable_reconnu";
];
```

### M04 · `repair_sufficiency` · RULE · lignes 71-71
- source_key: `fence`
- projection_id: `RULE.M04.REPAIR_SUFFICIENCY.FENCE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
fence:"monde_nécessaire_à_l_usage_ne_doît_pas_rendre_dette_infinie_sans_critère_de_clôture";
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

### M08 · `historical_closure` · SCHEMA · lignes 103-111
- source_key: `@block`
- projection_id: `SRCFRAG.M08.HISTORICAL_CLOSURE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@historical_closure{
types:["délibérée","cumulative","connue_non_empêchée","contrainte_matérielle","apparente"];
rules:[
"résultat_survivant≠nécessité";
"disparition≠inviabilité_intrinsèque";
"victoire≠supériorité";
"réforme_peut_convertir_privilège";
]
}
```

### M08 · `historical_closure` · SCHEMA · lignes 104-104
- source_key: `types`
- projection_id: `SCHEMA.M08.HISTORICAL_CLOSURE.TYPES`
- semantic_role: `declared_structure`
- a2_role: `nan`
- a2_confidence: `nan`

```text
types:["délibérée","cumulative","connue_non_empêchée","contrainte_matérielle","apparente"];
```

### M08 · `historical_closure` · RULE · lignes 105-111
- source_key: `rules[0]`
- projection_id: `RULE.M08.HISTORICAL_CLOSURE.RULES_01`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"résultat_survivant≠nécessité";
"disparition≠inviabilité_intrinsèque";
"victoire≠supériorité";
"réforme_peut_convertir_privilège";
]
}
```

### M08 · `historical_closure` · RULE · lignes 105-111
- source_key: `rules[1]`
- projection_id: `RULE.M08.HISTORICAL_CLOSURE.RULES_02`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"résultat_survivant≠nécessité";
"disparition≠inviabilité_intrinsèque";
"victoire≠supériorité";
"réforme_peut_convertir_privilège";
]
}
```

### M08 · `historical_closure` · RULE · lignes 105-111
- source_key: `rules[2]`
- projection_id: `RULE.M08.HISTORICAL_CLOSURE.RULES_03`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"résultat_survivant≠nécessité";
"disparition≠inviabilité_intrinsèque";
"victoire≠supériorité";
"réforme_peut_convertir_privilège";
]
}
```

### M08 · `historical_closure` · RULE · lignes 105-111
- source_key: `rules[3]`
- projection_id: `RULE.M08.HISTORICAL_CLOSURE.RULES_04`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"résultat_survivant≠nécessité";
"disparition≠inviabilité_intrinsèque";
"victoire≠supériorité";
"réforme_peut_convertir_privilège";
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
