# CAP.DISTRIBUTED_MEMORY_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 14,15
- rationale: 14/15 décrivent le même mécanisme porteur-trace-réactivation; ne fusionne pas avec continuité subjective.


## Relations pertinentes du graphe 11.x

- `CAP.DISTRIBUTED_MEMORY_ASSESSMENT --supports[contextual]--> CAP.CONTINUITY_ASSESSMENT`
- `CAP.CONTINUITY_ASSESSMENT --uses[contextual]--> CAP.DISTRIBUTED_MEMORY_ASSESSMENT`


## Backlinks 10.x

### M14 · `distributed_memory` · SCHEMA · lignes 41-49
- source_key: `@block`
- projection_id: `SRCFRAG.M14.DISTRIBUTED_MEMORY`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@distributed_memory{
forms:["interne","corporelle","relationnelle","environnementale","dynamique","institutionnelle","archivistique"];
rules:[
"mémoire≠stockage_local";
"trace≠mémoire_effective_sans_porteur_et_réactivation";
"mémoire_fonctionnelle≠souvenir_vécu";
"archive_dominante≠mémoire_totale";
];
}
```

### M14 · `distributed_memory` · SCHEMA · lignes 42-42
- source_key: `forms`
- projection_id: `SCHEMA.M14.DISTRIBUTED_MEMORY.FORMS`
- semantic_role: `declared_structure`
- a2_role: `nan`
- a2_confidence: `nan`

```text
forms:["interne","corporelle","relationnelle","environnementale","dynamique","institutionnelle","archivistique"];
```

### M14 · `distributed_memory` · RULE · lignes 43-48
- source_key: `rules[0]`
- projection_id: `RULE.M14.DISTRIBUTED_MEMORY.RULES_01`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"mémoire≠stockage_local";
"trace≠mémoire_effective_sans_porteur_et_réactivation";
"mémoire_fonctionnelle≠souvenir_vécu";
"archive_dominante≠mémoire_totale";
];
```

### M14 · `distributed_memory` · RULE · lignes 43-48
- source_key: `rules[1]`
- projection_id: `RULE.M14.DISTRIBUTED_MEMORY.RULES_02`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"mémoire≠stockage_local";
"trace≠mémoire_effective_sans_porteur_et_réactivation";
"mémoire_fonctionnelle≠souvenir_vécu";
"archive_dominante≠mémoire_totale";
];
```

### M14 · `distributed_memory` · RULE · lignes 43-48
- source_key: `rules[2]`
- projection_id: `RULE.M14.DISTRIBUTED_MEMORY.RULES_03`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"mémoire≠stockage_local";
"trace≠mémoire_effective_sans_porteur_et_réactivation";
"mémoire_fonctionnelle≠souvenir_vécu";
"archive_dominante≠mémoire_totale";
];
```

### M14 · `distributed_memory` · RULE · lignes 43-48
- source_key: `rules[3]`
- projection_id: `RULE.M14.DISTRIBUTED_MEMORY.RULES_04`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"mémoire≠stockage_local";
"trace≠mémoire_effective_sans_porteur_et_réactivation";
"mémoire_fonctionnelle≠souvenir_vécu";
"archive_dominante≠mémoire_totale";
];
```

### M15 · `distributed_memory` · SCHEMA · lignes 41-50
- source_key: `@block`
- projection_id: `SRCFRAG.M15.DISTRIBUTED_MEMORY`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@distributed_memory{
forms:["interne","corporelle","relationnelle","environnementale","dynamique","institutionnelle","archivistique"];
require:["trace","porteur","réactivation","effet_sur_suite","extinction_ou_révision"];
rules:[
"mémoire≠stockage_interne_unique";
"trace_conservée≠mémoire_effective";
"mémoire_fonctionnelle≠souvenir_vécu";
"archive_sans_communauté_de_réactivation≠continuité";
];
}
```

### M15 · `distributed_memory` · SCHEMA · lignes 42-42
- source_key: `forms`
- projection_id: `SCHEMA.M15.DISTRIBUTED_MEMORY.FORMS`
- semantic_role: `declared_structure`
- a2_role: `nan`
- a2_confidence: `nan`

```text
forms:["interne","corporelle","relationnelle","environnementale","dynamique","institutionnelle","archivistique"];
```

### M15 · `distributed_memory` · SCHEMA · lignes 43-43
- source_key: `require`
- projection_id: `SCHEMA.M15.DISTRIBUTED_MEMORY.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:["trace","porteur","réactivation","effet_sur_suite","extinction_ou_révision"];
```

### M15 · `distributed_memory` · RULE · lignes 44-49
- source_key: `rules[0]`
- projection_id: `RULE.M15.DISTRIBUTED_MEMORY.RULES_01`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"mémoire≠stockage_interne_unique";
"trace_conservée≠mémoire_effective";
"mémoire_fonctionnelle≠souvenir_vécu";
"archive_sans_communauté_de_réactivation≠continuité";
];
```

### M15 · `distributed_memory` · RULE · lignes 44-49
- source_key: `rules[1]`
- projection_id: `RULE.M15.DISTRIBUTED_MEMORY.RULES_02`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"mémoire≠stockage_interne_unique";
"trace_conservée≠mémoire_effective";
"mémoire_fonctionnelle≠souvenir_vécu";
"archive_sans_communauté_de_réactivation≠continuité";
];
```

### M15 · `distributed_memory` · RULE · lignes 44-49
- source_key: `rules[2]`
- projection_id: `RULE.M15.DISTRIBUTED_MEMORY.RULES_03`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"mémoire≠stockage_interne_unique";
"trace_conservée≠mémoire_effective";
"mémoire_fonctionnelle≠souvenir_vécu";
"archive_sans_communauté_de_réactivation≠continuité";
];
```

### M15 · `distributed_memory` · RULE · lignes 44-49
- source_key: `rules[3]`
- projection_id: `RULE.M15.DISTRIBUTED_MEMORY.RULES_04`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"mémoire≠stockage_interne_unique";
"trace_conservée≠mémoire_effective";
"mémoire_fonctionnelle≠souvenir_vécu";
"archive_sans_communauté_de_réactivation≠continuité";
];
```
