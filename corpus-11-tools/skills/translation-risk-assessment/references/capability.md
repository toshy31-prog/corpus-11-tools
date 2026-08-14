# CAP.TRANSLATION_RISK_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 16
- rationale: Mécanisme propre de perte/changement de statut sous traduction et langue pivot.


## Relations pertinentes du graphe 11.x

- `CAP.SOURCE_ENVIRONMENT_ASSESSMENT --uses[contextual]--> CAP.TRANSLATION_RISK_ASSESSMENT`


## Backlinks 10.x

### M16 · `language_audit` · SCHEMA · lignes 56-67
- source_key: `@block`
- projection_id: `SRCFRAG.M16.LANGUAGE_AUDIT`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@language_audit{
ask:[
"qui_est_sujet_grammatical?";
"quel_passif_efface_acteur?";
"quel_euphémisme_transforme_action_en_situation?";
"quel_mot_attribue_intention?";
"quel_terme_est_traduit_par_langue_pivot?";
"quel_champ_de_conflits_est_perdu?";
"qui_reçoit_visage,guillemets,réserve_ou_statut_de_fait?";
];
rule:"langue_distribue_agency,preuve_et_légitimité";
}
```

### M16 · `language_audit` · SCHEMA · lignes 57-65
- source_key: `ask`
- projection_id: `SCHEMA.M16.LANGUAGE_AUDIT.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"qui_est_sujet_grammatical?";
"quel_passif_efface_acteur?";
"quel_euphémisme_transforme_action_en_situation?";
"quel_mot_attribue_intention?";
"quel_terme_est_traduit_par_langue_pivot?";
"quel_champ_de_conflits_est_perdu?";
"qui_reçoit_visage,guillemets,réserve_ou_statut_de_fait?";
];
```

### M16 · `language_audit` · RULE · lignes 66-66
- source_key: `rule`
- projection_id: `RULE.M16.LANGUAGE_AUDIT.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"langue_distribue_agency,preuve_et_légitimité";
```

### M16 · `translation_gate` · SCHEMA · lignes 79-86
- source_key: `@block`
- projection_id: `SRCFRAG.M16.TRANSLATION_GATE`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@translation_gate{
ask:[
"terme_local_a-t-il_équivalent?";
"traduction_change-t-elle_statut_juridique,politique,religieux_ou_mémoriel?";
"concept_a-t-il_traversé_plusieurs_langues?";
];
rule:"traduire_mot_sans_champ_de_conflit_peut_falsifier_scène";
}
```

### M16 · `translation_gate` · SCHEMA · lignes 80-84
- source_key: `ask`
- projection_id: `SCHEMA.M16.TRANSLATION_GATE.ASK`
- semantic_role: `unknown_ask_role`
- a2_role: `unordered_probe`
- a2_confidence: `high`

```text
ask:[
"terme_local_a-t-il_équivalent?";
"traduction_change-t-elle_statut_juridique,politique,religieux_ou_mémoriel?";
"concept_a-t-il_traversé_plusieurs_langues?";
];
```

### M16 · `translation_gate` · RULE · lignes 85-85
- source_key: `rule`
- projection_id: `RULE.M16.TRANSLATION_GATE.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"traduire_mot_sans_champ_de_conflit_peut_falsifier_scène";
```
