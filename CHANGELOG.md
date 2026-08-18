# Journal des versions

## v1.3.0 — 2026-08-17

### Architecture

- séparation physique entre le produit `corpus-11-tools/` et les projets `research/` ;
- création de `corpus-11-tools/labs/` pour les moteurs génériques d’expérimentation et de simulation ;
- déplacement des configurations, résultats et conclusions propres aux projets vers `research/active/` ou `research/completed/` ;
- registre `transfers/` pour documenter les mécanismes acceptés, candidats ou refusés ;
- contrôle automatique interdisant aux outils Corpus de dépendre des recherches particulières.

### Extractions

- primitives Python réutilisables pour aléa commun, budgets appariés, dominance de Pareto et sensibilités bornées ;
- moteur générique de l’Open Experiment Arena et verrouillage des protocoles ;
- clôture d'exécution avec attestation d'artefacts, sortie sans écrasement et
  vérification du chemin de calcul verrouillé ;
- journal append-only récupérable et protocole institutionnel configurable,
  avec CCT Ops réduit à une politique et une façade de compatibilité ;
- conservation des adaptateurs scientifiques et résultats dans leur recherche d’origine ;
- reclassement du prototype alimentaire comme recherche terminée sans effet bénéficiaire établi.

## v1.2.0 — 2026-08-17

Première version stable du paquet Corpus 11 Tools. « Stable » qualifie ici le packaging, la taxonomie, la documentation, l’installation et les tests de non-régression ; ce terme ne valide pas scientifiquement les capabilities.

### Ajouts

- neuf capabilities de conception pour l’inférence, la validité, le transport, l’échelle, la dépendance des preuves, l’adaptation stratégique, la valeur de l’information et l’interférence entre capabilities ;
- Open Experiment Arena avec scénarios gelés, rivaux appariés, prédictions préalables et rapports vectoriels ;
- porte de rendement d’un projet et cas de clôture alimentaire ;
- pile de recherche CCT, laboratoire de gouvernance et artefacts exécutables clairement séparés du plugin utilisateur ;
- vérificateur documentaire pour les liens, versions, compteurs, descriptions et catégories taxonomiques.

### Taxonomie stabilisée

- 58 skills au total ;
- 49 wrappers de capability : 31 `candidate_unvalidated`, 9 `recovered_candidate_unvalidated`, 9 `design_candidate_unvalidated` ;
- 9 skills opérationnels sans nœud `CAP.*` ;
- 4 familles descriptives non exécutables ;
- 88 relations ;
- 71 évaluations de routage et de non-régression.

### Frontières maintenues

- succès synthétique ≠ validation extérieure ;
- test réussi ≠ déploiement ;
- paquet stable ≠ capability universellement robuste ;
- archive présente ≠ service actif ;
- prototype CCT ≠ autorité institutionnelle ni fonctionnalité utilisateur ordinaire.

## v1.2.0-alpha.2 — 2026-08-17

Release candidate installée et réobservée dans un premier parcours utilisateur convaincant avant le polish de stabilisation.

## v1.2.0-alpha.1 — 2026-08-17

Premier paquet alpha réunissant les neuf candidates de conception et les facultés historiques récupérées.
