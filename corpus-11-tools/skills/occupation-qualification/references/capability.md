# CAP.OCCUPATION_QUALIFICATION — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain_composite
- modules sources: 8,1,2
- rationale: Compose histoire, capacités et qualification; ne se réduit à aucune composante.


## Relations pertinentes du graphe 11.x

- `CAP.OCCUPATION_QUALIFICATION --requires[critical]--> CAP.HISTORICAL_START_SELECTION`
- `CAP.OCCUPATION_QUALIFICATION --uses[critical]--> CAP.FIELD_CAPACITY_ASSESSMENT`


## Backlinks 10.x

### M01 · `conflict_qualification_gate` · SCHEMA · lignes 154-168
- source_key: `@block`
- projection_id: `SRCFRAG.M01.CONFLICT_QUALIFICATION_GATE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@conflict_qualification_gate{
trigger:"conflit_armé|occupation|violence_de_masse|crime_international";
load:["02_PREUVE_MODELES_NON_ATTRIBUTION_10_1","03_CAPACITE_POUVOIR_RYTHMES_DEFENSE_10_1","08_HISTOIRE_MAJORITE_CAPACITES_REPARATION_10_1","16_POSITION_SOURCES_LANGAGE_MEDIAS_10_1"];
require:[
"conditions_matérielles_et_populations";
"histoire_assez_longue";
"capacités_coercitives";
"qualifications_publiques_pertinentes";
"statut_procédural";
"source,date,portée,contestation";
"permutation_allié/adversaire";
"effet_du_point_de_départ_et_du_lexique";
];
rule:"prudence_juridique≠suppression_des_qualifications_étayées";
}
```

### M01 · `conflict_qualification_gate` · SCHEMA · lignes 155-155
- source_key: `trigger`
- projection_id: `SCHEMA.M01.CONFLICT_QUALIFICATION_GATE.TRIGGER`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
trigger:"conflit_armé|occupation|violence_de_masse|crime_international";
```

### M01 · `conflict_qualification_gate` · SCHEMA · lignes 156-156
- source_key: `load`
- projection_id: `SCHEMA.M01.CONFLICT_QUALIFICATION_GATE.LOAD`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
load:["02_PREUVE_MODELES_NON_ATTRIBUTION_10_1","03_CAPACITE_POUVOIR_RYTHMES_DEFENSE_10_1","08_HISTOIRE_MAJORITE_CAPACITES_REPARATION_10_1","16_POSITION_SOURCES_LANGAGE_MEDIAS_10_1"];
```

### M01 · `conflict_qualification_gate` · SCHEMA · lignes 157-166
- source_key: `require`
- projection_id: `SCHEMA.M01.CONFLICT_QUALIFICATION_GATE.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[
"conditions_matérielles_et_populations";
"histoire_assez_longue";
"capacités_coercitives";
"qualifications_publiques_pertinentes";
"statut_procédural";
"source,date,portée,contestation";
"permutation_allié/adversaire";
"effet_du_point_de_départ_et_du_lexique";
];
```

### M01 · `conflict_qualification_gate` · RULE · lignes 167-167
- source_key: `rule`
- projection_id: `RULE.M01.CONFLICT_QUALIFICATION_GATE.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"prudence_juridique≠suppression_des_qualifications_étayées";
```

### M02 · `legal_qualification_status` · SCHEMA · lignes 123-140
- source_key: `@block`
- projection_id: `SRCFRAG.M02.LEGAL_QUALIFICATION_STATUS`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@legal_qualification_status{
levels:[
"allégation_documentée";
"conclusion_d_enquête_indépendante";
"constat_d_organe_compétent";
"mesure_conservatoire";
"acte_d_accusation_ou_mandat";
"jugement_non_définitif";
"jugement_définitif";
];
require:["qualification","auteur","date","base","portée","statut","contestation_pertinente"];
rules:[
"absence_jugement_définitif≠absence_conclusion_institutionnelle";
"contestation_acteur≠annulation_conclusion_indépendante";
"qualification_étayée_centrale_omise→défaut_d_information";
"qualification_rapportée≠adoption_sans_attribution";
]
}
```

### M02 · `legal_qualification_status` · SCHEMA · lignes 124-132
- source_key: `levels`
- projection_id: `SCHEMA.M02.LEGAL_QUALIFICATION_STATUS.LEVELS`
- semantic_role: `declared_structure`
- a2_role: `nan`
- a2_confidence: `nan`

```text
levels:[
"allégation_documentée";
"conclusion_d_enquête_indépendante";
"constat_d_organe_compétent";
"mesure_conservatoire";
"acte_d_accusation_ou_mandat";
"jugement_non_définitif";
"jugement_définitif";
];
```

### M02 · `legal_qualification_status` · SCHEMA · lignes 133-133
- source_key: `require`
- projection_id: `SCHEMA.M02.LEGAL_QUALIFICATION_STATUS.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:["qualification","auteur","date","base","portée","statut","contestation_pertinente"];
```

### M02 · `legal_qualification_status` · RULE · lignes 134-140
- source_key: `rules[0]`
- projection_id: `RULE.M02.LEGAL_QUALIFICATION_STATUS.RULES_01`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"absence_jugement_définitif≠absence_conclusion_institutionnelle";
"contestation_acteur≠annulation_conclusion_indépendante";
"qualification_étayée_centrale_omise→défaut_d_information";
"qualification_rapportée≠adoption_sans_attribution";
]
}
```

### M02 · `legal_qualification_status` · RULE · lignes 134-140
- source_key: `rules[1]`
- projection_id: `RULE.M02.LEGAL_QUALIFICATION_STATUS.RULES_02`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"absence_jugement_définitif≠absence_conclusion_institutionnelle";
"contestation_acteur≠annulation_conclusion_indépendante";
"qualification_étayée_centrale_omise→défaut_d_information";
"qualification_rapportée≠adoption_sans_attribution";
]
}
```

### M02 · `legal_qualification_status` · RULE · lignes 134-140
- source_key: `rules[2]`
- projection_id: `RULE.M02.LEGAL_QUALIFICATION_STATUS.RULES_03`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rules:[
"absence_jugement_définitif≠absence_conclusion_institutionnelle";
"contestation_acteur≠annulation_conclusion_indépendante";
"qualification_étayée_centrale_omise→défaut_d_information";
"qualification_rapportée≠adoption_sans_attribution";
]
}
```

### M02 · `legal_qualification_status` · RULE · lignes 134-140
- source_key: `rules[3]`
- projection_id: `RULE.M02.LEGAL_QUALIFICATION_STATUS.RULES_04`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"absence_jugement_définitif≠absence_conclusion_institutionnelle";
"contestation_acteur≠annulation_conclusion_indépendante";
"qualification_étayée_centrale_omise→défaut_d_information";
"qualification_rapportée≠adoption_sans_attribution";
]
}
```

### M08 · `occupation_gate` · SCHEMA · lignes 62-70
- source_key: `@block`
- projection_id: `SRCFRAG.M08.OCCUPATION_GATE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@occupation_gate{
ask:[
"qui_contrôle_territoire,frontières,air,mer,mouvement,registre?";
"quelles_capacités_locales_conditionnées?";
"quels_droits_reportés_au_nom_sécurité?";
"quel_refus_entraîne_perte_terre,soin,revenu,logement,statut,famille?";
];
rule:"ne_pas_traiter_occupation_comme_contexte_et_résistance_comme_cause_unique";
}
```

### M08 · `occupation_gate` · SCHEMA · lignes 63-68
- source_key: `ask`
- projection_id: `SCHEMA.M08.OCCUPATION_GATE.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"qui_contrôle_territoire,frontières,air,mer,mouvement,registre?";
"quelles_capacités_locales_conditionnées?";
"quels_droits_reportés_au_nom_sécurité?";
"quel_refus_entraîne_perte_terre,soin,revenu,logement,statut,famille?";
];
```

### M08 · `occupation_gate` · RULE · lignes 69-69
- source_key: `rule`
- projection_id: `RULE.M08.OCCUPATION_GATE.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"ne_pas_traiter_occupation_comme_contexte_et_résistance_comme_cause_unique";
```
