# CAP.COERCIVE_CAPACITY_MAPPING — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 3
- rationale: Cartographie de capacités coercitives et pertes réciproques; mécanisme propre.


## Relations pertinentes du graphe 11.x

- `CAP.COERCIVE_CAPACITY_MAPPING --uses[critical]--> CAP.FIELD_CAPACITY_ASSESSMENT`


## Backlinks 10.x

### M03 · `coercive_capacity_map` · SCHEMA · lignes 38-50
- source_key: `@block`
- projection_id: `SRCFRAG.M03.COERCIVE_CAPACITY_MAP`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@coercive_capacity_map{
include:[
"armée_et_groupes_armés";
"occupation_et_présence_militaire";
"frontières,air,mer,registre,mobilité";
"blocus,siège,privation,dépendance_logistique";
"frappe,incursion,arrestation,détention";
"roquettes,attentats,otages,attaques_civils";
"colonisation,expropriation,démolition,expulsion";
"contrôle_des_flux_financiers,énergétiques,informationnels";
];
rule:"ne_pas_réduire_violence_aux_seules_armes_du_dominé";
}
```

### M03 · `coercive_capacity_map` · SCHEMA · lignes 39-48
- source_key: `include`
- projection_id: `SCHEMA.M03.COERCIVE_CAPACITY_MAP.INCLUDE`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
include:[
"armée_et_groupes_armés";
"occupation_et_présence_militaire";
"frontières,air,mer,registre,mobilité";
"blocus,siège,privation,dépendance_logistique";
"frappe,incursion,arrestation,détention";
"roquettes,attentats,otages,attaques_civils";
"colonisation,expropriation,démolition,expulsion";
"contrôle_des_flux_financiers,énergétiques,informationnels";
];
```

### M03 · `coercive_capacity_map` · RULE · lignes 49-49
- source_key: `rule`
- projection_id: `RULE.M03.COERCIVE_CAPACITY_MAP.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"ne_pas_réduire_violence_aux_seules_armes_du_dominé";
```

### M03 · `reciprocal_power_loss` · SCHEMA · lignes 52-62
- source_key: `@block`
- projection_id: `SRCFRAG.M03.RECIPROCAL_POWER_LOSS`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@reciprocal_power_loss{
require:[
"capacité_nuisible_de_chaque_acteur";
"mesure_proportionnée_au_pouvoir_réel";
"ordre_de_mise_en_œuvre";
"vérification_indépendante";
"garantie_contre_réactivation";
"recours_populations";
];
rule:"désarmement_du_plus_faible_sans_retrait_dispositif_dominant→perte_unilatérale,non_paix";
}
```

### M03 · `reciprocal_power_loss` · SCHEMA · lignes 53-60
- source_key: `require`
- projection_id: `SCHEMA.M03.RECIPROCAL_POWER_LOSS.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[
"capacité_nuisible_de_chaque_acteur";
"mesure_proportionnée_au_pouvoir_réel";
"ordre_de_mise_en_œuvre";
"vérification_indépendante";
"garantie_contre_réactivation";
"recours_populations";
];
```

### M03 · `reciprocal_power_loss` · RULE · lignes 61-61
- source_key: `rule`
- projection_id: `RULE.M03.RECIPROCAL_POWER_LOSS.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"désarmement_du_plus_faible_sans_retrait_dispositif_dominant→perte_unilatérale,non_paix";
```

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
