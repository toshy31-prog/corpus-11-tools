# Automatisation du portefeuille de recherche

## Objet

`scripts/portfolio_cycle.py` donne une vue exécutable de tous les dossiers
actifs. Il vérifie leur présence, leur état courant et, pour les projets ayant
des tests locaux déclarés, exécute seulement ces tests.

Il peut produire des données synthétiques, des distributions et des conclusions
scientifiques **bornées** lorsque le contrat d’équivalence le permet. Avec
`--record`, il met à jour un état de routine et un rapport horodaté dans chaque
dossier après une exécution réussie. Une ressource extérieure absente n'est pas
un blocage : la routine poursuit par théorie, calcul, simulation ou fiction.

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

Une évolution sémantique progresse d'abord sur des entrées internes déclarées :
modèle, calcul, scénario, distribution, monde fictif ou environnement simulé.
Le cycle ne sollicite ni terrain, ni partenaire, ni consentement, ni collecte,
ni évaluateur extérieur. Une épreuve IRL ne peut être discutée qu'après avoir
écarté explicitement toutes les autres voies capables d'éprouver la faille
nommée, conformément à la
[`politique d'exécution`](RESEARCH_EXECUTION_POLICY.md).

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
