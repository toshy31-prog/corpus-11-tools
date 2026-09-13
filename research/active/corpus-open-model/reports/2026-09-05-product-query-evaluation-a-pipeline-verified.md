# Évaluation A des requêtes produit v0.1 — jalon archivé

## Statut

`pipeline_verified`

## Résultat autorisé

Sur les 18 requêtes synthétiques pré-enregistrées et gelées, le pipeline A
produit exactement les trois champs déclaratifs attendus : `route`,
`scope_limit` et `withdrawal_condition`. Il ne produit aucune conclusion
factuelle.

La ventilation observée est de 3 requêtes pour chacune des six catégories
gelées (`A1`, `A2`, `D1`, `D2`, `D3`, `M1`) et de 6 requêtes pour chacune des
trois langues (`fr`, `en`, `de`). Les 18 comparaisons sont exactes pour les
trois champs.

## Trace gelée et exécution

- Scellé pré-exécution :
  [`pre_execution_seal_v0.1.json`](../product_query_evaluation_a/pre_execution_seal_v0.1.json)
  (`manifest_sha256` :
  `66de670802f4d128724cb4c3ddb4a376ad27a77be2bc897695125b1821f84a7b`).
- Rapport de l'unique exécution :
  [`report.json`](../artifacts/product-query-evaluation-a-v0.1-2026-09-05/report.json).
- Contrat local : les trois tests du baseline passent ; les tests du protocole
  passent également avant l'exécution scellée.

## Frontières maintenues

Ce jalon n'établit pas que le routeur comprend les langues, qu'il est robuste,
ni qu'un routeur neuronal doit être réhabilité. Il n'autorise ni intégration au
plugin, ni conclusion externe, ni réglage après observation.

`CorpusNet-Router v0` reste `experimental_not_preferred`. Cette vérification
porte seulement sur le baseline lexical déterministe, fermé aux six catégories
et aux sorties gelées de cette évaluation.

## États de changement

| État | Observation |
| --- | --- |
| Proposé | Évaluation A selon le protocole `PRODUCT_QUERY_EVALUATION_PROTOCOL_v0.1`. |
| Écrit | Baseline fermé, inventaire de routes, attentes, manifeste et runner. |
| Testé | Trois tests de contrat du baseline et les contrôles du protocole sont passés avant l'exécution. |
| Intégré | Non : aucun changement du plugin ou de la route de produit. |
| Réobservé | Non requis pour ce jalon ; le rapport ci-dessus est la trace de l'unique exécution autorisée. |

## Arrêt et condition de reprise

Le jalon est clos. Il ne faut ni relancer les 18 requêtes, ni modifier ce
baseline, ni ouvrir une phase de réglage à partir de leur résultat.

Un travail ultérieur ne peut commencer que lorsqu'un candidat de routeur
réellement distinct est disponible et qu'un nouveau jeu indépendant est gelé
avant comparaison. Cette condition ne permet pas d'ajuster le baseline actuel.
