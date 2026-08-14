# CAP.DIFFERENCE_REMAINDER_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 5,14,18
- rationale: Même mécanisme de non-équivalence avec reste dans futurs/capacités/traces/retour/possible.


## Relations pertinentes du graphe 11.x

- `CAP.FICTION_MECHANISM_TRANSFORMATION --requires[critical]--> CAP.DIFFERENCE_REMAINDER_ASSESSMENT`


## Backlinks 10.x

### M05 · `difference_remainder` · SCHEMA · lignes 16-30
- source_key: `@block`
- projection_id: `SRCFRAG.M05.DIFFERENCE_REMAINDER`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@difference_remainder{
require_any:[
"futur_change";
"capacité_disparaît_ou_apparaît";
"coût_de_retour";
"trace_persiste";
"possibilité_se_ferme_ou_s_ouvre";
"contrefactuel_diverge";
"même_performance_exige_coût";
"portée_ou_synchronisation_diminue";
"règle_de_clôture_ou_reprise_disparaît";
"dépendance_externe_augmente";
];
rule:"aucune_trace,conséquence,contrainte_ou_divergence_possible→différence_non_établie";
}
```

### M05 · `difference_remainder` · SCHEMA · lignes 17-28
- source_key: `require_any`
- projection_id: `SCHEMA.M05.DIFFERENCE_REMAINDER.REQUIRE_ANY`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require_any:[
"futur_change";
"capacité_disparaît_ou_apparaît";
"coût_de_retour";
"trace_persiste";
"possibilité_se_ferme_ou_s_ouvre";
"contrefactuel_diverge";
"même_performance_exige_coût";
"portée_ou_synchronisation_diminue";
"règle_de_clôture_ou_reprise_disparaît";
"dépendance_externe_augmente";
];
```

### M05 · `difference_remainder` · RULE · lignes 29-29
- source_key: `rule`
- projection_id: `RULE.M05.DIFFERENCE_REMAINDER.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
rule:"aucune_trace,conséquence,contrainte_ou_divergence_possible→différence_non_établie";
```

### M14 · `ontological_difference` · SCHEMA · lignes 83-87
- source_key: `@block`
- projection_id: `SRCFRAG.M14.ONTOLOGICAL_DIFFERENCE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@ontological_difference{
criterion:"non_équivalence_porteuse_de_reste";
remainder:["futur","capacité","coût_retour","trace","possibilité_fermée","contrefactuel"];
fence:"différence_sans_reste_possible→duplication_non_discriminante";
}
```

### M14 · `ontological_difference` · SCHEMA · lignes 84-84
- source_key: `criterion`
- projection_id: `SCHEMA.M14.ONTOLOGICAL_DIFFERENCE.CRITERION`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
criterion:"non_équivalence_porteuse_de_reste";
```

### M14 · `ontological_difference` · SCHEMA · lignes 85-85
- source_key: `remainder`
- projection_id: `SCHEMA.M14.ONTOLOGICAL_DIFFERENCE.REMAINDER`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
remainder:["futur","capacité","coût_retour","trace","possibilité_fermée","contrefactuel"];
```

### M14 · `ontological_difference` · RULE · lignes 86-86
- source_key: `fence`
- projection_id: `RULE.M14.ONTOLOGICAL_DIFFERENCE.FENCE`
- semantic_role: `unresolved_rule`
- a2_role: `literal_implication`
- a2_confidence: `high`

```text
fence:"différence_sans_reste_possible→duplication_non_discriminante";
```

### M18 · `remainder_gate` · SCHEMA · lignes 87-96
- source_key: `@block`
- projection_id: `SRCFRAG.M18.REMAINDER_GATE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@remainder_gate{
require_any:[
"conséquence_qui_surprend_la_prémisse";
"acteur_ou_relation_qui_ne_se_réduit_pas_à_sa_fonction";
"perte_non_convertie_en_symbole";
"choix_qui_ne_clôt_pas_interprétation";
"monde_qui_continue_sans_devenir_message";
];
fence:"ambiguïté_décorative≠reste";
}
```

### M18 · `remainder_gate` · SCHEMA · lignes 88-94
- source_key: `require_any`
- projection_id: `SCHEMA.M18.REMAINDER_GATE.REQUIRE_ANY`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require_any:[
"conséquence_qui_surprend_la_prémisse";
"acteur_ou_relation_qui_ne_se_réduit_pas_à_sa_fonction";
"perte_non_convertie_en_symbole";
"choix_qui_ne_clôt_pas_interprétation";
"monde_qui_continue_sans_devenir_message";
];
```

### M18 · `remainder_gate` · RULE · lignes 95-95
- source_key: `fence`
- projection_id: `RULE.M18.REMAINDER_GATE.FENCE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
fence:"ambiguïté_décorative≠reste";
```

### M18 · `gravity_test` · SCHEMA · lignes 156-171
- source_key: `@block`
- projection_id: `SRCFRAG.M18.GRAVITY_TEST`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@gravity_test{
ask:[
"qu_est-ce_qui_fait_peser_les_événements?";
"quel_type_de_perte_compte?";
"quelle_question_la_fin_rend-elle_inévitable?";
"quelle_distribution_de_responsabilité_est_naturalisée?";
"quel_concept_du_corpus_réapparaît_sans_son_nom?";
];
fail:[
"responsabilité_comme_destination_automatique";
"archives_ou_preuve_comme_moteur_automatique";
"pouvoir_et_recours_comme_seule_gravité";
"réparation_ou_futur_empêché_comme_clôture_automatique";
];
fence:"ces_motifs_restent_autorisés_si_demandés;ils_sont_bloqués_seulement_quand_l_extériorité_est_la_scène";
}
```

### M18 · `gravity_test` · SCHEMA · lignes 157-163
- source_key: `ask`
- projection_id: `SCHEMA.M18.GRAVITY_TEST.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"qu_est-ce_qui_fait_peser_les_événements?";
"quel_type_de_perte_compte?";
"quelle_question_la_fin_rend-elle_inévitable?";
"quelle_distribution_de_responsabilité_est_naturalisée?";
"quel_concept_du_corpus_réapparaît_sans_son_nom?";
];
```

### M18 · `gravity_test` · SCHEMA · lignes 164-169
- source_key: `fail`
- projection_id: `SCHEMA.M18.GRAVITY_TEST.FAIL`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
fail:[
"responsabilité_comme_destination_automatique";
"archives_ou_preuve_comme_moteur_automatique";
"pouvoir_et_recours_comme_seule_gravité";
"réparation_ou_futur_empêché_comme_clôture_automatique";
];
```

### M18 · `gravity_test` · RULE · lignes 170-170
- source_key: `fence`
- projection_id: `RULE.M18.GRAVITY_TEST.FENCE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
fence:"ces_motifs_restent_autorisés_si_demandés;ils_sont_bloqués_seulement_quand_l_extériorité_est_la_scène";
```
