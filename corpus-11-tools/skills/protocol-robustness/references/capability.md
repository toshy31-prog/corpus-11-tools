# CAP.PROTOCOL_ROBUSTNESS — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 2,10,15
- rationale: Même mécanisme: tester la persistance/explicabilité sous variation de protocole.


## Relations pertinentes du graphe 11.x

- `CAP.PROTOCOL_ROBUSTNESS --supports[optional]--> CAP.DETECTABILITY_ASSESSMENT`
- `CAP.CONSCIOUSNESS_EVIDENCE_ASSESSMENT --uses[critical]--> CAP.PROTOCOL_ROBUSTNESS`
- `CAP.CHANGE_VALIDATION --uses[critical]--> CAP.PROTOCOL_ROBUSTNESS`


## Backlinks 10.x

### M02 · `protocol_capacity_split` · SCHEMA · lignes 99-106
- source_key: `@block`
- projection_id: `SRCFRAG.M02.PROTOCOL_CAPACITY_SPLIT`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@protocol_capacity_split{
rule:"échec_au_protocole≠absence_de_capacité";
ask:[
"capacité_ciblée_distincte_de_comprendre/tolérer_test?";
"résultat_persiste_si_canal,testeur,rythme,motivation,milieu_changent?";
"quels_échecs_préspécifiés_feraient_conclure_non_établie?";
];
}
```

### M02 · `protocol_capacity_split` · RULE · lignes 100-100
- source_key: `rule`
- projection_id: `RULE.M02.PROTOCOL_CAPACITY_SPLIT.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"échec_au_protocole≠absence_de_capacité";
```

### M02 · `protocol_capacity_split` · SCHEMA · lignes 101-105
- source_key: `ask`
- projection_id: `SCHEMA.M02.PROTOCOL_CAPACITY_SPLIT.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"capacité_ciblée_distincte_de_comprendre/tolérer_test?";
"résultat_persiste_si_canal,testeur,rythme,motivation,milieu_changent?";
"quels_échecs_préspécifiés_feraient_conclure_non_établie?";
];
```

### M02 · `cross_channel_test` · SCHEMA · lignes 113-116
- source_key: `@block`
- projection_id: `SRCFRAG.M02.CROSS_CHANNEL_TEST`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@cross_channel_test{
run:["prédictions_par_canal","varier_un_canal","conserver_divergences","chercher_dépendance_au_dispositif"];
rule:"résultats_incompatibles→ne_pas_moyenner_avant_expliquer";
}
```

### M02 · `cross_channel_test` · PROCEDURE · lignes 114-114
- source_key: `run`
- projection_id: `PROC.M02.CROSS_CHANNEL_TEST.RUN`
- semantic_role: `run_sequence`
- a2_role: `ordered_procedure`
- a2_confidence: `high`

```text
run:["prédictions_par_canal","varier_un_canal","conserver_divergences","chercher_dépendance_au_dispositif"];
```

### M02 · `cross_channel_test` · RULE · lignes 115-115
- source_key: `rule`
- projection_id: `RULE.M02.CROSS_CHANNEL_TEST.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"résultats_incompatibles→ne_pas_moyenner_avant_expliquer";
```

### M10 · `robustness_test` · SCHEMA · lignes 91-94
- source_key: `@block`
- projection_id: `SRCFRAG.M10.ROBUSTNESS_TEST`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@robustness_test{
compare:["succès_dans_un_milieu","capacité_après_variation_canal,temps,testeur,motivation,charge"];
rule:"succès_isolé≠capacité_robuste";
}
```

### M10 · `robustness_test` · SCHEMA · lignes 92-92
- source_key: `compare`
- projection_id: `SCHEMA.M10.ROBUSTNESS_TEST.COMPARE`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
compare:["succès_dans_un_milieu","capacité_après_variation_canal,temps,testeur,motivation,charge"];
```

### M10 · `robustness_test` · RULE · lignes 93-93
- source_key: `rule`
- projection_id: `RULE.M10.ROBUSTNESS_TEST.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"succès_isolé≠capacité_robuste";
```

### M15 · `protocol_capacity` · SCHEMA · lignes 23-30
- source_key: `@block`
- projection_id: `SRCFRAG.M15.PROTOCOL_CAPACITY`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@protocol_capacity{
rules:[
"échec_protocole≠absence_capacité";
"succès_protocole≠capacité_robuste";
"capacité_observée=capacité_propre×champ×lisibilité_test×histoire";
];
require:["canal","fenêtre","motivation","stress","apprentissage","milieu_absent","perturbation"];
}
```

### M15 · `protocol_capacity` · RULE · lignes 24-28
- source_key: `rules[0]`
- projection_id: `RULE.M15.PROTOCOL_CAPACITY.RULES_01`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"échec_protocole≠absence_capacité";
"succès_protocole≠capacité_robuste";
"capacité_observée=capacité_propre×champ×lisibilité_test×histoire";
];
```

### M15 · `protocol_capacity` · RULE · lignes 24-28
- source_key: `rules[1]`
- projection_id: `RULE.M15.PROTOCOL_CAPACITY.RULES_02`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"échec_protocole≠absence_capacité";
"succès_protocole≠capacité_robuste";
"capacité_observée=capacité_propre×champ×lisibilité_test×histoire";
];
```

### M15 · `protocol_capacity` · RULE · lignes 24-28
- source_key: `rules[2]`
- projection_id: `RULE.M15.PROTOCOL_CAPACITY.RULES_03`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rules:[
"échec_protocole≠absence_capacité";
"succès_protocole≠capacité_robuste";
"capacité_observée=capacité_propre×champ×lisibilité_test×histoire";
];
```

### M15 · `protocol_capacity` · SCHEMA · lignes 29-29
- source_key: `require`
- projection_id: `SCHEMA.M15.PROTOCOL_CAPACITY.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:["canal","fenêtre","motivation","stress","apprentissage","milieu_absent","perturbation"];
```

### M15 · `protocol_portability` · SCHEMA · lignes 32-35
- source_key: `@block`
- projection_id: `SRCFRAG.M15.PROTOCOL_PORTABILITY`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@protocol_portability{
vary:["canal","testeur","rythme","motivation","charge","milieu"];
rule:"capacité_robuste→effet_conservé_ou_variation_expliquée";
}
```

### M15 · `protocol_portability` · SCHEMA · lignes 33-33
- source_key: `vary`
- projection_id: `SCHEMA.M15.PROTOCOL_PORTABILITY.VARY`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
vary:["canal","testeur","rythme","motivation","charge","milieu"];
```

### M15 · `protocol_portability` · RULE · lignes 34-34
- source_key: `rule`
- projection_id: `RULE.M15.PROTOCOL_PORTABILITY.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"capacité_robuste→effet_conservé_ou_variation_expliquée";
```
