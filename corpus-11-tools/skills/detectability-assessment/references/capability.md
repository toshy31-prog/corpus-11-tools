# CAP.DETECTABILITY_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat tant qu’aucune validation contextuelle indépendante ne l’établit.

## Définition runtime

- statut: candidate_unvalidated
- classe: retain
- modules sources: 2
- rationale: Capacité locale distincte: établir ce qu'un dispositif peut réellement détecter.


## Relations pertinentes du graphe 11.x

- `FAM.DISCRIMINANT_COMPARISON --related_specialization[contextual]--> CAP.DETECTABILITY_ASSESSMENT`
- `CAP.PROTOCOL_ROBUSTNESS --supports[optional]--> CAP.DETECTABILITY_ASSESSMENT`
- `CAP.CONSCIOUSNESS_EVIDENCE_ASSESSMENT --requires[critical]--> CAP.DETECTABILITY_ASSESSMENT`
- `CAP.REFUSAL_ATTRIBUTION --uses[contextual]--> CAP.DETECTABILITY_ASSESSMENT`
- `CAP.OBSERVABLE_COMPILATION --uses[contextual]--> CAP.DETECTABILITY_ASSESSMENT`


## Backlinks 10.x

### M02 · `detection_audit` · SCHEMA · lignes 61-75
- source_key: `@block`
- projection_id: `SRCFRAG.M02.DETECTION_AUDIT`
- semantic_role: `source_fragment`
- a2_role: `nan`
- a2_confidence: `nan`

```text
@detection_audit{
require:[
"phénomène";
"traces_recevables";
"échelle,fenêtre,seuil,bruit";
"perturbation_du_protocole";
"trace_inrecevable_par_dispositif";
"qui_contrôle_archive,capteur,accès_et_publication";
"canal_sensoriel_ou_documentaire_supposé";
"histoire_d_exposition";
"conditions_absentes";
"protocole_pouvant_produire_réponse_ou_échec";
];
rule:"absence_de_trace_sans_capacité_de_détection_établie→U;contrôle_de_détectabilité→pouvoir_à_auditer";
}
```

### M02 · `detection_audit` · SCHEMA · lignes 62-73
- source_key: `require`
- projection_id: `SCHEMA.M02.DETECTION_AUDIT.REQUIRE`
- semantic_role: `unknown_require_role`
- a2_role: `criteria`
- a2_confidence: `high`

```text
require:[
"phénomène";
"traces_recevables";
"échelle,fenêtre,seuil,bruit";
"perturbation_du_protocole";
"trace_inrecevable_par_dispositif";
"qui_contrôle_archive,capteur,accès_et_publication";
"canal_sensoriel_ou_documentaire_supposé";
"histoire_d_exposition";
"conditions_absentes";
"protocole_pouvant_produire_réponse_ou_échec";
];
```

### M02 · `detection_audit` · RULE · lignes 74-74
- source_key: `rule`
- projection_id: `RULE.M02.DETECTION_AUDIT.RULE`
- semantic_role: `unresolved_rule`
- a2_role: `compound_unresolved`
- a2_confidence: `unresolved`

```text
rule:"absence_de_trace_sans_capacité_de_détection_établie→U;contrôle_de_détectabilité→pouvoir_à_auditer";
```
