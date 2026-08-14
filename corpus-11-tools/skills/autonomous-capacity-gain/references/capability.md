# CAP.AUTONOMOUS_CAPACITY_GAIN — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain_specialization
- modules sources: 5,17
- rationale: Sous-capacité spécialisée de transformation réelle: gain autonome plutôt qu'adaptation dépendante.


## Relations pertinentes du graphe 11.x

- `CAP.REAL_TRANSFORMATION_ASSESSMENT --supports_specialization[contextual]--> CAP.AUTONOMOUS_CAPACITY_GAIN`
- `CAP.REAL_TRANSFORMATION_ASSESSMENT --has_specialization[structural]--> CAP.AUTONOMOUS_CAPACITY_GAIN`


## Backlinks 10.x

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
