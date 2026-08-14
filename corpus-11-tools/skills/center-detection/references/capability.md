# CAP.CENTER_DETECTION — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 3
- rationale: Détection de centres effectifs via orchestration, veto et dépendance; non réductible au pouvoir indirect général.


## Relations pertinentes du graphe 11.x

- `FAM.INDIRECT_POWER_ANALYSIS --specialization[contextual]--> CAP.CENTER_DETECTION`
- `CAP.CENTER_DETECTION --uses[contextual]--> CAP.CHAIN_TRACING`


## Backlinks 10.x

### M03 · `orchestration` · SCHEMA · lignes 17-19
- source_key: `@block`
- projection_id: `SRCFRAG.M03.ORCHESTRATION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@orchestration{
rule:"composer_rythmes,relations,mesures,accès,exceptions,catégories,archives_ou_paramètres_exerce_un_pouvoir";
}
```

### M03 · `orchestration` · RULE · lignes 18-18
- source_key: `rule`
- projection_id: `RULE.M03.ORCHESTRATION.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"composer_rythmes,relations,mesures,accès,exceptions,catégories,archives_ou_paramètres_exerce_un_pouvoir";
```

### M03 · `center_detection` · SCHEMA · lignes 21-24
- source_key: `@block`
- projection_id: `SRCFRAG.M03.CENTER_DETECTION`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@center_detection{
formula:"centre=contrôle{clé,seuil,quorum,arrêt,reset,classement,fréquence,fenêtre,catégorie,délai,exception,focale,connexion,preuve,archive,publication}";
rule:"plusieurs_nœuds+paramètre_unique→centre_crypté;gouverner_sans_ordonner_est_possible";
}
```

### M03 · `center_detection` · SCHEMA · lignes 22-22
- source_key: `formula`
- projection_id: `SCHEMA.M03.CENTER_DETECTION.FORMULA`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
formula:"centre=contrôle{clé,seuil,quorum,arrêt,reset,classement,fréquence,fenêtre,catégorie,délai,exception,focale,connexion,preuve,archive,publication}";
```

### M03 · `center_detection` · RULE · lignes 23-23
- source_key: `rule`
- projection_id: `RULE.M03.CENTER_DETECTION.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `compound_unresolved`
- a2_confidence: `unresolved`

```text
rule:"plusieurs_nœuds+paramètre_unique→centre_crypté;gouverner_sans_ordonner_est_possible";
```
