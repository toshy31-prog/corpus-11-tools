# CAP.SOURCE_ENVIRONMENT_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain_composite
- modules sources: 16,10,2,4
- rationale: Compose provenance, institutions, langues, formats et contestabilité; chain tracing seul ne suffit pas.


## Relations pertinentes du graphe 11.x

- `CAP.CHAIN_TRACING --supports[contextual]--> CAP.SOURCE_ENVIRONMENT_ASSESSMENT`
- `CAP.SOURCE_ENVIRONMENT_ASSESSMENT --requires[critical]--> CAP.CHAIN_TRACING`
- `CAP.SOURCE_ENVIRONMENT_ASSESSMENT --uses[contextual]--> CAP.TRANSLATION_RISK_ASSESSMENT`
- `CAP.MEDIA_POWER_ASSESSMENT --uses[contextual]--> CAP.SOURCE_ENVIRONMENT_ASSESSMENT`
- `CAP.VISUAL_SCENE_COMPILATION --uses[contextual]--> CAP.SOURCE_ENVIRONMENT_ASSESSMENT`


## Backlinks 10.x

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

### M10 · `source_environment_drill` · SCHEMA · lignes 74-84
- source_key: `@block`
- projection_id: `SRCFRAG.M10.SOURCE_ENVIRONMENT_DRILL`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@source_environment_drill{
run:[
"identifier_auteur,institution,mandat,financement,public";
"langue_initiale,traductions,indexation";
"données_primaires_et_reprises";
"ce_que_format_peut_recevoir";
"qui_peut_contester_et_clore";
"capacité_politique_du_récit";
"fait_faisant_perdre_cadrage";
];
}
```

### M10 · `source_environment_drill` · PROCEDURE · lignes 75-83
- source_key: `run`
- projection_id: `PROC.M10.SOURCE_ENVIRONMENT_DRILL.RUN`
- semantic_role: `run_sequence`
- a2_role: `ordered_procedure`
- a2_confidence: `high`

```text
run:[
"identifier_auteur,institution,mandat,financement,public";
"langue_initiale,traductions,indexation";
"données_primaires_et_reprises";
"ce_que_format_peut_recevoir";
"qui_peut_contester_et_clore";
"capacité_politique_du_récit";
"fait_faisant_perdre_cadrage";
];
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

### M16 · `false_plurality` · SCHEMA · lignes 88-95
- source_key: `@block`
- projection_id: `SRCFRAG.M16.FALSE_PLURALITY`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@false_plurality{
ask:[
"sources_partagent-elles_donnée_primaire?";
"même_agence,langue_pivot,catégories,calendrier?";
"reprises_sont-elles_comptées_comme_origines?";
];
rule:"pluralité_de_documents≠pluralité_de_sources_ni_de_mondes";
}
```

### M16 · `false_plurality` · SCHEMA · lignes 89-93
- source_key: `ask`
- projection_id: `SCHEMA.M16.FALSE_PLURALITY.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"sources_partagent-elles_donnée_primaire?";
"même_agence,langue_pivot,catégories,calendrier?";
"reprises_sont-elles_comptées_comme_origines?";
];
```

### M16 · `false_plurality` · RULE · lignes 94-94
- source_key: `rule`
- projection_id: `RULE.M16.FALSE_PLURALITY.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"pluralité_de_documents≠pluralité_de_sources_ni_de_mondes";
```
