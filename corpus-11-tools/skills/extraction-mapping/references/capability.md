# CAP.EXTRACTION_MAPPING — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 17
- rationale: Cartographie des circuits d'extraction/bénéficiaires/porteurs/veto; distinct du parent pouvoir indirect.


## Relations pertinentes du graphe 11.x

- `FAM.INDIRECT_POWER_ANALYSIS --specialization[contextual]--> CAP.EXTRACTION_MAPPING`
- `CAP.EXTRACTION_MAPPING --uses[contextual]--> CAP.CHAIN_TRACING`


## Backlinks 10.x

### M17 · `structural_power` · SCHEMA · lignes 5-13
- source_key: `@block`
- projection_id: `SRCFRAG.M17.STRUCTURAL_POWER`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@structural_power{
definition:"ordre_transnational_de_classes,institutions_et_appareils_aux_intérêts_souvent_convergents_sans_commandement_unique";
rules:[
"absence_de_chef_unique≠absence_de_structure";
"concurrence_entre_dominants≠fin_de_l_ordre";
"populations_dominées_peuvent_porter_coût_des_accords_comme_des_conflits";
"structure_doît_être_mécanisée,non_personnage_omnipotent";
];
}
```

### M17 · `structural_power` · SCHEMA · lignes 6-6
- source_key: `definition`
- projection_id: `SCHEMA.M17.STRUCTURAL_POWER.DEFINITION`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
definition:"ordre_transnational_de_classes,institutions_et_appareils_aux_intérêts_souvent_convergents_sans_commandement_unique";
```

### M17 · `structural_power` · RULE · lignes 7-12
- source_key: `rules[0]`
- projection_id: `RULE.M17.STRUCTURAL_POWER.RULES_01`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"absence_de_chef_unique≠absence_de_structure";
"concurrence_entre_dominants≠fin_de_l_ordre";
"populations_dominées_peuvent_porter_coût_des_accords_comme_des_conflits";
"structure_doît_être_mécanisée,non_personnage_omnipotent";
];
```

### M17 · `structural_power` · RULE · lignes 7-12
- source_key: `rules[1]`
- projection_id: `RULE.M17.STRUCTURAL_POWER.RULES_02`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"absence_de_chef_unique≠absence_de_structure";
"concurrence_entre_dominants≠fin_de_l_ordre";
"populations_dominées_peuvent_porter_coût_des_accords_comme_des_conflits";
"structure_doît_être_mécanisée,non_personnage_omnipotent";
];
```

### M17 · `structural_power` · RULE · lignes 7-12
- source_key: `rules[2]`
- projection_id: `RULE.M17.STRUCTURAL_POWER.RULES_03`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"absence_de_chef_unique≠absence_de_structure";
"concurrence_entre_dominants≠fin_de_l_ordre";
"populations_dominées_peuvent_porter_coût_des_accords_comme_des_conflits";
"structure_doît_être_mécanisée,non_personnage_omnipotent";
];
```

### M17 · `structural_power` · RULE · lignes 7-12
- source_key: `rules[3]`
- projection_id: `RULE.M17.STRUCTURAL_POWER.RULES_04`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"absence_de_chef_unique≠absence_de_structure";
"concurrence_entre_dominants≠fin_de_l_ordre";
"populations_dominées_peuvent_porter_coût_des_accords_comme_des_conflits";
"structure_doît_être_mécanisée,non_personnage_omnipotent";
];
```

### M17 · `structure_evidence` · SCHEMA · lignes 15-27
- source_key: `@block`
- projection_id: `SRCFRAG.M17.STRUCTURE_EVIDENCE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@structure_evidence{
require:[
"circuits_de_propriété";
"chaînes_de_financement";
"bénéficiaires";
"capacités_de_décision_et_veto";
"mécanismes_de_transmission";
"effets_observables";
"prédiction_différente";
"condition_de_renversement";
];
rule:"caste,système,capital_expliquant_tout_sans_perdre→hypothèse_auto-immunisée";
}
```

### M17 · `structure_evidence` · SCHEMA · lignes 16-25
- source_key: `require`
- projection_id: `SCHEMA.M17.STRUCTURE_EVIDENCE.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[
"circuits_de_propriété";
"chaînes_de_financement";
"bénéficiaires";
"capacités_de_décision_et_veto";
"mécanismes_de_transmission";
"effets_observables";
"prédiction_différente";
"condition_de_renversement";
];
```

### M17 · `structure_evidence` · RULE · lignes 26-26
- source_key: `rule`
- projection_id: `RULE.M17.STRUCTURE_EVIDENCE.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"caste,système,capital_expliquant_tout_sans_perdre→hypothèse_auto-immunisée";
```

### M17 · `extraction_map` · SCHEMA · lignes 29-41
- source_key: `@block`
- projection_id: `SRCFRAG.M17.EXTRACTION_MAP`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@extraction_map{
ask:[
"qui_possède?";
"qui_autorise?";
"qui_finance?";
"qui_fixe_prix_et_normes?";
"qui_contrôle_infrastructures,raffinage,logistique,finance?";
"qui_porte_risque,travail,pollution,déplacement?";
"quelle_valeur_reste_localement?";
"qui_peut_refuser,sortir,réparer?";
];
rule:"possession_géologique≠maîtrise_de_la_chaîne";
}
```

### M17 · `extraction_map` · SCHEMA · lignes 30-39
- source_key: `ask`
- projection_id: `SCHEMA.M17.EXTRACTION_MAP.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"qui_possède?";
"qui_autorise?";
"qui_finance?";
"qui_fixe_prix_et_normes?";
"qui_contrôle_infrastructures,raffinage,logistique,finance?";
"qui_porte_risque,travail,pollution,déplacement?";
"quelle_valeur_reste_localement?";
"qui_peut_refuser,sortir,réparer?";
];
```

### M17 · `extraction_map` · RULE · lignes 40-40
- source_key: `rule`
- projection_id: `RULE.M17.EXTRACTION_MAP.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"possession_géologique≠maîtrise_de_la_chaîne";
```
