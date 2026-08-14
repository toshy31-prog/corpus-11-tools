# CAP.REFUSAL_ATTRIBUTION — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain_specialization
- modules sources: 7,2,10
- rationale: Critères propres au refus réel; spécialisation autonome, non fusionnable avec attribution générale.


## Relations pertinentes du graphe 11.x

- `FAM.ATTRIBUTION_GROUNDING --specialization[contextual]--> CAP.REFUSAL_ATTRIBUTION`
- `CAP.REFUSAL_ATTRIBUTION --uses[contextual]--> CAP.DETECTABILITY_ASSESSMENT`


## Backlinks 10.x

### M02 · `non_attribution` · SCHEMA · lignes 142-145
- source_key: `@block`
- projection_id: `SRCFRAG.M02.NON_ATTRIBUTION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@non_attribution{
rule:"signal,trace,archive,comportement,corrélation,auto-modèle,refus_produit,avatar,opacité_ou_complexité_ne_valent_pas_seuls_identité,intention,consentement,conscience_ou_expérience";
fence:"non-attribution≠présomption_négative_illimitée";
}
```

### M02 · `non_attribution` · RULE · lignes 143-143
- source_key: `rule`
- projection_id: `RULE.M02.NON_ATTRIBUTION.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"signal,trace,archive,comportement,corrélation,auto-modèle,refus_produit,avatar,opacité_ou_complexité_ne_valent_pas_seuls_identité,intention,consentement,conscience_ou_expérience";
```

### M02 · `non_attribution` · RULE · lignes 144-144
- source_key: `fence`
- projection_id: `RULE.M02.NON_ATTRIBUTION.FENCE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
fence:"non-attribution≠présomption_négative_illimitée";
```

### M07 · `refusal_gate` · SCHEMA · lignes 49-52
- source_key: `@block`
- projection_id: `SRCFRAG.M07.REFUSAL_GATE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@refusal_gate{
require:["alternative_réelle","effet_matériel","trace","révision","non_contournement","recours"];
fence:["erreur≠refus","blocage≠refus","phrase_de_refus≠capacité_de_refus"];
}
```

### M07 · `refusal_gate` · SCHEMA · lignes 50-50
- source_key: `require`
- projection_id: `SCHEMA.M07.REFUSAL_GATE.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:["alternative_réelle","effet_matériel","trace","révision","non_contournement","recours"];
```

### M07 · `refusal_gate` · RULE · lignes 51-51
- source_key: `fence`
- projection_id: `RULE.M07.REFUSAL_GATE.FENCE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
fence:["erreur≠refus","blocage≠refus","phrase_de_refus≠capacité_de_refus"];
```

### M10 · `verb_test` · SCHEMA · lignes 86-89
- source_key: `@block`
- projection_id: `SRCFRAG.M10.VERB_TEST`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@verb_test{
verbs:["choisir","tromper","refuser","apprendre","communiquer","se_souvenir","décider","faciliter","sécuriser","déplacer"];
run:["description_observable","éléments_constitutifs","réintroduire_verbe_si_traces"];
}
```

### M10 · `verb_test` · SCHEMA · lignes 87-87
- source_key: `verbs`
- projection_id: `SCHEMA.M10.VERB_TEST.VERBS`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
verbs:["choisir","tromper","refuser","apprendre","communiquer","se_souvenir","décider","faciliter","sécuriser","déplacer"];
```

### M10 · `verb_test` · PROCEDURE · lignes 88-88
- source_key: `run`
- projection_id: `PROC.M10.VERB_TEST.RUN`
- semantic_role: `run_sequence`
- a2_role: `ordered_procedure`
- a2_confidence: `high`

```text
run:["description_observable","éléments_constitutifs","réintroduire_verbe_si_traces"];
```
