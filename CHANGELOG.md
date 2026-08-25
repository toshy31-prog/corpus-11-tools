# Journal des versions

## Unreleased

## v1.4.0 — 2026-08-25

### Gouvernance épistémique

- ajoute une gouvernance de **trajectoire de représentation** : chaque changement matériel peut déclarer son gain, son registre de pertes, ses contre-épreuves, sa condition de renversement/réouverture et sa voie de reconstruction ;
- ajoute `labs/epistemic-trajectory/`, un auditeur générique et testé pour compression, fusion, invention de primitive, oubli reconstructible et dérive de rôle d'une représentation ;
- étend le routage sans créer de nouvelle capability : une représentation locale ne peut pas être attribuée silencieusement au système entier, et un contrechamp ne vaut ni preuve ni compromis automatique ;
- documente le transfert recherche → Corpus sans importer les objets, paramètres ou résultats des expériences du 2026-08-18.

### Moteurs génériques et clôture d’exécution

- ajoute une clôture d’exécution attestée qui vérifie les verrous de protocole et d’exécution, exige un dossier de sortie neuf, hache les artefacts déclarés et produit une attestation non écrasable ;
- étend `simulation_campaign.py` à l’exploration appariée possibilités × scénarios × répétitions avec quantiles déclarés, frontières explicites et relations vectorielles sans score composite caché ;
- ajoute un event store append-only récupérable et des primitives de protocole institutionnel configurables pour propositions, décisions, recours, mandats et pouvoirs temporaires, sans politique CCT implicite ;
- ajoute un validateur sans dépendance d’un sous-ensemble JSON Schema explicitement borné, qui refuse les mots-clés hors contrat plutôt que de les ignorer ;
- enregistre les transferts recherche → Corpus correspondants avec tests indépendants du projet source et conditions explicites de retrait.

## v1.3.1 — 2026-08-25

### Identité de release

- publie l’état courant de `main` sous un nouveau tag immuable, sans déplacer
  le tag historique divergent `v1.3.0` ;
- aligne le manifeste, l’inventaire, le contrat de stabilité et la matrice de
  validation sur cette identité ;
- dérive le chemin de la matrice de validation depuis l’identité déclarée,
  afin qu’une future release ne conserve pas une référence de version figée.

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
- retrait d’un prototype hors périmètre du produit.

## v1.2.0 — 2026-08-17

Première version stable du paquet Corpus 11 Tools. « Stable » qualifie ici le packaging, la taxonomie, la documentation, l’installation et les tests de non-régression ; ce terme ne valide pas scientifiquement les capabilities.

### Ajouts

- neuf capabilities de conception pour l’inférence, la validité, le transport, l’échelle, la dépendance des preuves, l’adaptation stratégique, la valeur de l’information et l’interférence entre capabilities ;
- Open Experiment Arena avec scénarios gelés, rivaux appariés, prédictions préalables et rapports vectoriels ;
- porte de rendement d’un projet et mécanisme de clôture contrôlée ;
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
