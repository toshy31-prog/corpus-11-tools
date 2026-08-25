# Automatisation du portefeuille de recherche

## Objet

`scripts/portfolio_cycle.py` donne une vue exécutable de tous les dossiers
actifs. Il vérifie leur présence, leur état courant et, pour les projets ayant
des tests locaux déclarés, exécute seulement ces tests.

Il peut produire des données synthétiques, des distributions et des conclusions
scientifiques **bornées** lorsque le contrat d’équivalence le permet. Avec
`--record`, il met à jour un état de routine et un rapport horodaté dans chaque
dossier après une exécution réussie. Un blocage externe est un résultat de
routage, pas un échec à masquer.

## Modes

- `--check` : audit structurel et état de chaque dossier ;
- `--run-safe-checks` : ajoute les vérifications locales non mutantes déjà
  disponibles ;
- `--record` : exécute les vérifications sûres et enregistre le résultat de la
  routine dans chaque dossier ;
- `--tree` : affiche l’arborescence active compacte.

## Autorité et limites

Le cycle spécialisé de `corpus-hypotheses` reste son propre mécanisme :
[`active/corpus-hypotheses/AUTOMATION.md`](active/corpus-hypotheses/AUTOMATION.md).
Il peut créer une branche locale et exige un dépôt propre ; le cycle de
portefeuille ne le déclenche donc jamais automatiquement.

Une évolution sémantique ne devient possible que lorsqu’un dossier a une entrée
admissible : banc matériel, cas consentis, problème externe gelé, site terrain,
ou distribution alpha et solveur contrôlé. Le cycle global doit alors remettre
le dossier à un agent de recherche ou à un protocole explicite, pas inventer
l’entrée manquante.

Une entrée synthétique est admissible si elle satisfait le
[`contrat d’équivalence synthétique`](SYNTHETIC_EQUIVALENCE.md). La routine peut
alors conclure `formal_exact`, `model_internal` ou `pipeline_verified` ;
`external_equivalent` requiert calibration et test indépendant.

Les écritures de routine sont limitées à `state/last_automation_run.md` et
`reports/automation/`. Elles consignent l’exécution et ne changent ni statut
scientifique, ni hypothèse, ni source.

## Critère de couverture

Un dossier est couvert seulement s’il possède :

1. une entrée dans `portfolio.json` ;
2. un `README.md` et `state/current_state.md` ;
3. un mode d’avancement et une prochaine décision ;
4. des vérifications sûres, lorsqu’elles existent ;
5. un blocage explicite lorsqu’aucune action automatique légitime n’existe.
