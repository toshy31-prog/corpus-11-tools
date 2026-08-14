# CAP.CHAIN_TRACING — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain_general
- modules sources: 4,16,17
- rationale: Mécanisme commun de suivi ordonné et bornage d'attribution; finalités spécialisées restent distinctes.


## Relations pertinentes du graphe 11.x

- `CAP.CHAIN_TRACING --supports[contextual]--> CAP.SOURCE_ENVIRONMENT_ASSESSMENT`
- `CAP.SOURCE_ENVIRONMENT_ASSESSMENT --requires[critical]--> CAP.CHAIN_TRACING`
- `CAP.EXTRACTION_MAPPING --uses[contextual]--> CAP.CHAIN_TRACING`
- `CAP.CENTER_DETECTION --uses[contextual]--> CAP.CHAIN_TRACING`


## Backlinks 10.x

### M04 · `transmission_chain` · SCHEMA · lignes 4-7
- source_key: `@block`
- projection_id: `SRCFRAG.M04.TRANSMISSION_CHAIN`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@transmission_chain{
chain:"émetteur→canal→réception→compréhension→capacité_d_agir→coût_de_maintien→action→effet→trace→réactivation_ou_extinction";
rule:"maillon_inconnu→ne_pas_attribuer_l_aval;chaîne_anthropomorphe_ne_vaut_pas_pour_toute_causalité_distribuée";
}
```

### M04 · `transmission_chain` · SCHEMA · lignes 5-5
- source_key: `chain`
- projection_id: `SCHEMA.M04.TRANSMISSION_CHAIN.CHAIN`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
chain:"émetteur→canal→réception→compréhension→capacité_d_agir→coût_de_maintien→action→effet→trace→réactivation_ou_extinction";
```

### M04 · `transmission_chain` · RULE · lignes 6-6
- source_key: `rule`
- projection_id: `RULE.M04.TRANSMISSION_CHAIN.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `compound_unresolved`
- a2_confidence: `unresolved`

```text
rule:"maillon_inconnu→ne_pas_attribuer_l_aval;chaîne_anthropomorphe_ne_vaut_pas_pour_toute_causalité_distribuée";
```

### M04 · `documentary_transmission` · SCHEMA · lignes 17-20
- source_key: `@block`
- projection_id: `SRCFRAG.M04.DOCUMENTARY_TRANSMISSION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@documentary_transmission{
chain:"événement→trace→conservation→classement→accès→traduction→indexation→citation→réception_publique→effet";
rule:"rupture_ou_contrôle_d_un_maillon_modifie_ce_qui_devient_réel_public";
}
```

### M04 · `documentary_transmission` · SCHEMA · lignes 18-18
- source_key: `chain`
- projection_id: `SCHEMA.M04.DOCUMENTARY_TRANSMISSION.CHAIN`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
chain:"événement→trace→conservation→classement→accès→traduction→indexation→citation→réception_publique→effet";
```

### M04 · `documentary_transmission` · RULE · lignes 19-19
- source_key: `rule`
- projection_id: `RULE.M04.DOCUMENTARY_TRANSMISSION.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"rupture_ou_contrôle_d_un_maillon_modifie_ce_qui_devient_réel_public";
```

### M16 · `source_passport` · SCHEMA · lignes 13-31
- source_key: `@block`
- projection_id: `SRCFRAG.M16.SOURCE_PASSPORT`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@source_passport{
fields:[
"auteur";
"institution";
"mandat";
"propriété,financement,alliances";
"public_visé";
"date_et_situation";
"langue_initiale";
"traductions";
"données_primaires";
"chaîne_de_reprises";
"format";
"capacité_de_publication,indexation,certification";
"qui_peut_contester";
"qui_peut_clore";
];
rule:"lire_document_sans_environnement→lecture_incomplète";
}
```

### M16 · `source_passport` · SCHEMA · lignes 14-29
- source_key: `fields`
- projection_id: `SCHEMA.M16.SOURCE_PASSPORT.FIELDS`
- semantic_role: `declared_structure`
- a2_role: `nan`
- a2_confidence: `nan`

```text
fields:[
"auteur";
"institution";
"mandat";
"propriété,financement,alliances";
"public_visé";
"date_et_situation";
"langue_initiale";
"traductions";
"données_primaires";
"chaîne_de_reprises";
"format";
"capacité_de_publication,indexation,certification";
"qui_peut_contester";
"qui_peut_clore";
];
```

### M16 · `source_passport` · RULE · lignes 30-30
- source_key: `rule`
- projection_id: `RULE.M16.SOURCE_PASSPORT.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"lire_document_sans_environnement→lecture_incomplète";
```

### M16 · `source_family_map` · SCHEMA · lignes 42-54
- source_key: `@block`
- projection_id: `SRCFRAG.M16.SOURCE_FAMILY_MAP`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@source_family_map{
families:[
"humanitaire:besoins,services,accès;risque_d_effacer_acteur_et_histoire";
"juridique:qualification,statut,recours;risque_d_étroitesse_procédurale";
"militaire:sécurité,cible,menace;risque_de_compiler_justification";
"administrative:autoriser,faciliter,coordonner;risque_d_arrêter_chaîne_au_seuil";
"économique:potentiel,gouvernance,valeur;risque_de_traduire_extraction_en_déficit";
"médiatique:événement,intelligibilité;risque_d_intensité_et_dépendance_aux_sources";
"militante:continuité,mémoire,accusation;risque_de_conversion_du_soupçon_en_preuve";
"communautaire:vécu,relations,mémoire;risque_de_sous-documentation_et_non_homogénéité";
];
rule:"fonction_institutionnelle≠mensonge;mandat_fiable≠totalité";
}
```

### M16 · `source_family_map` · SCHEMA · lignes 43-52
- source_key: `families`
- projection_id: `SCHEMA.M16.SOURCE_FAMILY_MAP.FAMILIES`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
families:[
"humanitaire:besoins,services,accès;risque_d_effacer_acteur_et_histoire";
"juridique:qualification,statut,recours;risque_d_étroitesse_procédurale";
"militaire:sécurité,cible,menace;risque_de_compiler_justification";
"administrative:autoriser,faciliter,coordonner;risque_d_arrêter_chaîne_au_seuil";
"économique:potentiel,gouvernance,valeur;risque_de_traduire_extraction_en_déficit";
"médiatique:événement,intelligibilité;risque_d_intensité_et_dépendance_aux_sources";
"militante:continuité,mémoire,accusation;risque_de_conversion_du_soupçon_en_preuve";
"communautaire:vécu,relations,mémoire;risque_de_sous-documentation_et_non_homogénéité";
];
```

### M16 · `source_family_map` · RULE · lignes 53-53
- source_key: `rule`
- projection_id: `RULE.M16.SOURCE_FAMILY_MAP.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"fonction_institutionnelle≠mensonge;mandat_fiable≠totalité";
```

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
