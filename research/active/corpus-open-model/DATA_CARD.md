# Fiche de données — CorpusNet-Router v0

## Objet appris

Le modèle apprend une tâche étroite : associer un texte de requête à zéro, une
ou plusieurs **capabilities déclarées** dans l'inventaire Corpus. Il n'apprend
ni une vérité scientifique, ni une réponse conversationnelle, ni l'autorité de
modifier Corpus.

## Provenance et partitions

| Matériau | Usage | Statut |
| --- | --- | --- |
| `corpus-11-tools/skills/*/SKILL.md` (front matter) | entraînement, une description étiquetée par skill | produit déclaré ; description ≠ capability établie |
| `corpus-11-tools/evals/routing-and-nonregression.jsonl` | prompts étiquetés, partitionnés par identifiant stable | évaluation interne ; ne constitue pas une preuve externe |
| snapshot du dépôt | registre de provenance et graphe, pas entraînement textuel direct | mélange de carriers, chacun conserve son statut |

Les prompts d'évaluation sont répartis par hachage stable en `train` (≈70 %),
`validation` (≈15 %) et `test` (≈15 %). Un prompt de `test` n'est jamais donné
au réseau pendant l'entraînement. Les descriptions de skills restent dans le
train : elles sont la définition opérationnelle publique des étiquettes, pas
des exemples de requêtes indépendants.

## Couverture et exclusions

Le snapshot adresse tous les matériaux observables du dépôt, mais seuls les
deux jeux ci-dessus sont supervisés dans v0. Archives, transferts, résultats de
recherche, documents PDF et fixtures ne sont **pas** absorbés comme labels ou
faits. Ils devront passer par une politique d'ingestion et un jeu de tests
propre avant tout entraînement futur.

## Licence et diffusion

Aucun fichier de licence n'a été observé à la racine du workspace au moment du
scaffold. La redistribution d'un dataset consolidé ou de poids entraînés sur
des documents non explicitement licenciés est donc `unknown` et interdite par
la politique du projet jusqu'à audit humain. Les artefacts locaux restent
reconstruisibles mais ignorés par Git.

## Limites connues

- corpus très petit et étiquettes déséquilibrées ;
- français dominant, descriptions de skills en anglais ;
- le sac de mots ne conserve ni négation, ni ordre, ni graphe relationnel ;
- les métriques internes mesurent un routage, non une compréhension ni une
  validité de méthode ;
- le jeu de test peut partager le vocabulaire et la vision de Corpus : il ne
  mesure pas une généralisation indépendante.
