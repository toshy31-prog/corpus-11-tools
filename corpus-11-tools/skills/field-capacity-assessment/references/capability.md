# CAP.FIELD_CAPACITY_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 3
- rationale: Capacité distincte: évaluer une capacité comme dépendante du champ/dispositif/histoire.


## Relations pertinentes du graphe 11.x

- `CAP.HIDDEN_COST_ASSESSMENT --supports[optional]--> CAP.FIELD_CAPACITY_ASSESSMENT`
- `CAP.OCCUPATION_QUALIFICATION --uses[critical]--> CAP.FIELD_CAPACITY_ASSESSMENT`
- `CAP.COERCIVE_CAPACITY_MAPPING --uses[critical]--> CAP.FIELD_CAPACITY_ASSESSMENT`


## Backlinks 10.x

### M03 · `capacity_status` · SCHEMA · lignes 4-4
- source_key: `@block`
- projection_id: `SRCFRAG.M03.CAPACITY_STATUS`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@capacity_status{E:"observée_utilisable";C:"conditionnelle";A:"non_établie";X:"indisponible"}
```

### M03 · `capacity_status` · SCHEMA · lignes 4-4
- source_key: `E`
- projection_id: `SCHEMA.M03.CAPACITY_STATUS.E`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@capacity_status{E:"observée_utilisable";C:"conditionnelle";A:"non_établie";X:"indisponible"}
```

### M03 · `capacity_status` · SCHEMA · lignes 4-4
- source_key: `C`
- projection_id: `SCHEMA.M03.CAPACITY_STATUS.C`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@capacity_status{E:"observée_utilisable";C:"conditionnelle";A:"non_établie";X:"indisponible"}
```

### M03 · `capacity_status` · SCHEMA · lignes 4-4
- source_key: `A`
- projection_id: `SCHEMA.M03.CAPACITY_STATUS.A`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@capacity_status{E:"observée_utilisable";C:"conditionnelle";A:"non_établie";X:"indisponible"}
```

### M03 · `capacity_status` · SCHEMA · lignes 4-4
- source_key: `X`
- projection_id: `SCHEMA.M03.CAPACITY_STATUS.X`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@capacity_status{E:"observée_utilisable";C:"conditionnelle";A:"non_établie";X:"indisponible"}
```

### M03 · `field_capacity` · SCHEMA · lignes 6-15
- source_key: `@block`
- projection_id: `SRCFRAG.M03.FIELD_CAPACITY`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@field_capacity{
definition:"capacité_produite_par_environnement,infrastructures,conventions,ressources_et_histoire";
audit:[
"retirer_le_champ_modifie-t-il_puissance?";
"qui_fournit,finance,maintient,retire?";
"qui_porte_coût?";
"quels_canaux,énergie,partenaires,mémoire,apprentissage,sortie,retour?";
];
rule:"sortie_observée=capacité_propre×capacité_de_champ×lisibilité_du_dispositif×histoire";
}
```

### M03 · `field_capacity` · SCHEMA · lignes 7-7
- source_key: `definition`
- projection_id: `SCHEMA.M03.FIELD_CAPACITY.DEFINITION`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
definition:"capacité_produite_par_environnement,infrastructures,conventions,ressources_et_histoire";
```

### M03 · `field_capacity` · SCHEMA · lignes 8-13
- source_key: `audit`
- projection_id: `SCHEMA.M03.FIELD_CAPACITY.AUDIT`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
audit:[
"retirer_le_champ_modifie-t-il_puissance?";
"qui_fournit,finance,maintient,retire?";
"qui_porte_coût?";
"quels_canaux,énergie,partenaires,mémoire,apprentissage,sortie,retour?";
];
```

### M03 · `field_capacity` · RULE · lignes 14-14
- source_key: `rule`
- projection_id: `RULE.M03.FIELD_CAPACITY.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"sortie_observée=capacité_propre×capacité_de_champ×lisibilité_du_dispositif×histoire";
```
