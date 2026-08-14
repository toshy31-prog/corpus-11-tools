# CAP.NON_LOCAL_DEBT_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 4
- rationale: Évalue dette/obligation au-delà de la proximité; distinct du simple chain tracing.


## Relations pertinentes du graphe 11.x

- `CAP.REPAIR_SUFFICIENCY --uses[contextual]--> CAP.NON_LOCAL_DEBT_ASSESSMENT`


## Backlinks 10.x

### M04 · `non_local_debt` · SCHEMA · lignes 37-41
- source_key: `@block`
- projection_id: `SRCFRAG.M04.NON_LOCAL_DEBT`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@non_local_debt{
definition:"dette_distribuée_sans_auteur_ou_lieu_unique";
allocation:["bénéficiaires","acteurs_capables_de_modifier","producteurs_de_la_mesure","porteurs_de_la_perte"];
rule:"non_localisé≠sans_porteur";
}
```

### M04 · `non_local_debt` · SCHEMA · lignes 38-38
- source_key: `definition`
- projection_id: `SCHEMA.M04.NON_LOCAL_DEBT.DEFINITION`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
definition:"dette_distribuée_sans_auteur_ou_lieu_unique";
```

### M04 · `non_local_debt` · SCHEMA · lignes 39-39
- source_key: `allocation`
- projection_id: `SCHEMA.M04.NON_LOCAL_DEBT.ALLOCATION`
- semantic_role: `source_field`
- a2_role: `nan`
- a2_confidence: `nan`

```text
allocation:["bénéficiaires","acteurs_capables_de_modifier","producteurs_de_la_mesure","porteurs_de_la_perte"];
```

### M04 · `non_local_debt` · RULE · lignes 40-40
- source_key: `rule`
- projection_id: `RULE.M04.NON_LOCAL_DEBT.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `atomic_rule`
- a2_confidence: `high`

```text
rule:"non_localisé≠sans_porteur";
```
