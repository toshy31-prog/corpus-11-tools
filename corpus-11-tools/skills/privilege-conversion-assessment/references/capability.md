# CAP.PRIVILEGE_CONVERSION_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 5,17
- rationale: Évalue conversion d'un privilège en capacité de contrôle renouvelée; mécanisme propre.


## Relations pertinentes du graphe 11.x

- `CAP.PRIVILEGE_CONVERSION_ASSESSMENT --uses[contextual]--> CAP.REAL_TRANSFORMATION_ASSESSMENT`


## Backlinks 10.x

### M05 · `privilege_reconfiguration` · SCHEMA · lignes 32-46
- source_key: `@block`
- projection_id: `SRCFRAG.M05.PRIVILEGE_RECONFIGURATION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@privilege_reconfiguration{
track:[
"propriété";
"rente";
"monopole";
"veto";
"transmission_héréditaire";
"immunité";
"contrôle_territorial";
"contrôle_productif";
"capacité_de_déplacer_coûts";
"capacité_de_réactivation";
];
rule:"changement_de_forme_sans_perte_sur_axes→modernisation_probable_de_domination";
}
```

### M05 · `privilege_reconfiguration` · SCHEMA · lignes 33-44
- source_key: `track`
- projection_id: `SCHEMA.M05.PRIVILEGE_RECONFIGURATION.TRACK`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
track:[
"propriété";
"rente";
"monopole";
"veto";
"transmission_héréditaire";
"immunité";
"contrôle_territorial";
"contrôle_productif";
"capacité_de_déplacer_coûts";
"capacité_de_réactivation";
];
```

### M05 · `privilege_reconfiguration` · RULE · lignes 45-45
- source_key: `rule`
- projection_id: `RULE.M05.PRIVILEGE_RECONFIGURATION.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"changement_de_forme_sans_perte_sur_axes→modernisation_probable_de_domination";
```

### M17 · `privilege_conversion` · SCHEMA · lignes 43-54
- source_key: `@block`
- projection_id: `SRCFRAG.M17.PRIVILEGE_CONVERSION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@privilege_conversion{
examples:[
"empire_direct→dette,bases,accords";
"propriété_visible→fonds,holdings,concessions";
"censure→sélection_editoriale,algorithmique";
"déplacement_forcé→évacuation,sécurisation,rénovation";
"extraction_brutale→transition,développement,compensation";
"hiérarchie_juridique→sélection_économique";
];
statement:"ceux_qui_perdent_la_forme_cherchent_souvent_à_conserver_le_pouvoir";
test:"suivre_propriété,rente,veto,transmission,immunité,territoire,production,déplacement_des_coûts,réactivation";
}
```

### M17 · `privilege_conversion` · SCHEMA · lignes 44-51
- source_key: `examples`
- projection_id: `SCHEMA.M17.PRIVILEGE_CONVERSION.EXAMPLES`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
examples:[
"empire_direct→dette,bases,accords";
"propriété_visible→fonds,holdings,concessions";
"censure→sélection_editoriale,algorithmique";
"déplacement_forcé→évacuation,sécurisation,rénovation";
"extraction_brutale→transition,développement,compensation";
"hiérarchie_juridique→sélection_économique";
];
```

### M17 · `privilege_conversion` · SCHEMA · lignes 52-52
- source_key: `statement`
- projection_id: `SCHEMA.M17.PRIVILEGE_CONVERSION.STATEMENT`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
statement:"ceux_qui_perdent_la_forme_cherchent_souvent_à_conserver_le_pouvoir";
```

### M17 · `privilege_conversion` · SCHEMA · lignes 53-53
- source_key: `test`
- projection_id: `SCHEMA.M17.PRIVILEGE_CONVERSION.TEST`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
test:"suivre_propriété,rente,veto,transmission,immunité,territoire,production,déplacement_des_coûts,réactivation";
```

### M17 · `self_reversal` · SCHEMA · lignes 144-151
- source_key: `@block`
- projection_id: `SRCFRAG.M17.SELF_REVERSAL`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@self_reversal{
ask:[
"pédagogie_devient-elle_doctrine,caste,police_du_langage,distinction_sociale?";
"enseignants_et_programmes_sont-ils_contestables?";
"hypothèses_concurrentes_et_contre-enquêtes_existent-elles?";
];
rule:"éducation_critique_doît_pouvoir_perdre_et_être_révisée";
}
```

### M17 · `self_reversal` · SCHEMA · lignes 145-149
- source_key: `ask`
- projection_id: `SCHEMA.M17.SELF_REVERSAL.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"pédagogie_devient-elle_doctrine,caste,police_du_langage,distinction_sociale?";
"enseignants_et_programmes_sont-ils_contestables?";
"hypothèses_concurrentes_et_contre-enquêtes_existent-elles?";
];
```

### M17 · `self_reversal` · RULE · lignes 150-150
- source_key: `rule`
- projection_id: `RULE.M17.SELF_REVERSAL.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"éducation_critique_doît_pouvoir_perdre_et_être_révisée";
```
