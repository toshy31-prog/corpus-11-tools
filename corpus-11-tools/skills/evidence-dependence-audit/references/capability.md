# CAP.EVIDENCE_DEPENDENCE_AUDIT — provenance opérationnelle

> Statut du nœud : candidat de conception non validé, distinct de l'environnement d'une source unique et du simple traçage de chaîne.

## Définition runtime

- statut: design_candidate_unvalidated
- classe: new_evidence_synthesis_boundary
- source de conception: risque de faux cumul probant entre expériences, reprises et générateurs communs

## Relations pertinentes du graphe 11.x

- `CAP.EVIDENCE_DEPENDENCE_AUDIT --requires[critical]--> CAP.CHAIN_TRACING`
- `CAP.EVIDENCE_DEPENDENCE_AUDIT --uses[contextual]--> CAP.SOURCE_ENVIRONMENT_ASSESSMENT`
- `CAP.EVIDENCE_DEPENDENCE_AUDIT --uses[contextual]--> CAP.METHOD_EFFECT_AUDIT`

## Schéma minimal

Pour chaque unité : `claim`, `raw_data`, `sampling_frame`, `source`, `reuse_chain`, `generator`, `code`, `model`, `assumptions`, `measurement`, `protocol`, `investigators`, `funding`, `date`, `failure_modes`.

Sortie : `dependence_edges`, `evidence_clusters`, `unique_support`, `shared_support`, `unknown_lineage`, `reversal_condition`.

## Procédure candidate

1. Définir ce qui compte comme unité de preuve pour la conclusion visée.
2. Tracer les porteurs et transformations jusqu'aux données ou observations racines.
3. Séparer réplication de calcul, réplication de mesure, nouvelle population et nouvelle méthode.
4. Regrouper les unités partageant un échec capable de renverser simultanément leurs résultats.
5. Rapporter le support par grappes et non par simple nombre de publications ou de sorties.

## Règles de verdict

- `même_source_republiée != sources_indépendantes`
- `même_générateur_nouveaux_seeds != mécanismes_indépendants`
- `nouveau_code_sur_mêmes_données -> indépendance_partielle_possible`, non automatique
- `lineage_inconnue -> independence_unknown`, jamais indépendante par défaut
- la diversité de formats ne vaut pas diversité probante
