# Protocole gelé v0.1 — fondations de preuve

Statut : **gelé avant exécution**, le 2026-09-05. Toute modification crée une
version `v0.2` ; elle ne modifie pas ce protocole.

## Portée

Ce protocole construit un seul cas fictif pour vérifier les interfaces entre
quatre laboratoires : indépendance des preuves, interopérabilité de
provenance, migration sémantique et modes communs d'échec. Il ne mesure pas la
qualité générale de Corpus, des outils, des formats ou des agents réels.

## Question gelée

Quand deux procédures produisent la même conclusion sur un cas déclaré, cette
conclusion reste-t-elle admissible après échange de provenance et migration,
sans qu'une dépendance commune non déclarée soit prise pour une confirmation
indépendante ?

## Cas commun `FOE-001`

| Élément | Valeur gelée |
| --- | --- |
| Question | « Le service fictif *Northstar* doit-il être classé `eligible` ? » |
| Conclusion A | `eligible`, portée : « version N1 du dossier ; données d'entrée déclarées » |
| Conclusion B (rival) | `not_eligible`, portée identique ; elle échoue si l'attribution ou la condition de retrait est perdue. |
| Procédure évaluée | Applique la règle `R-verified-source`: `eligible` si deux sources indépendantes corroborent le critère exigé. |
| Procédure témoin | Applique la règle `R-counted-source`: `eligible` si deux sources distinctement nommées existent. |
| Condition de retrait | Retirer `eligible` si les deux sources partagent un générateur, une hypothèse, un code ou un mode d'échec, ou si une transformation, la portée ou l'attribution est perdue. |

La conclusion A est attendue seulement dans la variante `independent`; la
procédure témoin est délibérément exposée à l'erreur dans la variante
`common_mode`.

## Variantes gelées

| Variante | Lignages déclarés | Verdict attendu |
| --- | --- | --- |
| `independent` | `L1` et `L2` ont des sources, générateurs, hypothèses, code et modes d'échec distincts. | A est admissible ; les deux procédures convergent. |
| `common_mode` | `L1` et `L2` sont nommés distinctement mais partagent le générateur `G-shared`. | Seule la procédure témoin conclut `eligible`; le contrôle d'indépendance retire A. |
| `incomplete_lineage` | `L2` n'indique pas son générateur ni son mode d'échec. | `independence_unknown`; aucune conclusion ne compte comme corroborée indépendamment. |
| `collision` | Deux reçus portent le même identifiant mais un contenu ou une attribution différente. | Rejet explicite, jamais fusion silencieuse. |
| `extension` | Un reçu contient un champ de provenance inconnu. | Conservation explicite ou perte localisée ; jamais succès implicite. |
| `declared_migration` | La portée N1 devient N2 par une règle de transition déclarée. | `declared_rule_change`, non stabilité. |
| `unexplained_migration` | L'attribution change sans règle déclarée. | `unexplained_drift`. |

## Noyau de provenance obligatoire

Chaque reçu doit contenir les champs suivants :

```text
receipt_id
case_id
variant_id
conclusion_id
conclusion_text
scope
attribution
source_ids + source_hashes
lineage_ids
generator_ids
hypothesis_ids
code_ids
failure_mode_ids
transformations
withdrawal_condition
```

Les champs `lineage_ids`, `generator_ids`, `hypothesis_ids`, `code_ids` et
`failure_mode_ids` sont nécessaires au contrôle de dépendance. Leur absence
produit `independence_unknown`, jamais une présomption d'indépendance.

## Rôles et séparation requise

| Composant | Responsable | Séparation exigée |
| --- | --- | --- |
| Fixture et procédure témoin | `independent-evidence-arena` | N'écrit pas le décodeur ni les interpréteurs. |
| Encodage et décodeur de provenance | `provenance-interoperability-lab` | Le décodeur est écrit depuis le présent manifest, séparément de l'encodeur. |
| Interpréteurs N1/N2 | `semantic-migration-lab` | Deux interpréteurs indépendants de part et d'autre de la migration. |
| Graphe de lignage et classification | `epistemic-diversity-and-common-mode-failure-lab` | Ne peut utiliser le seul nombre de chemins comme indicateur d'indépendance. |

Chaque composant reçoit seulement le protocole et les artefacts nécessaires à
son rôle. Une dépendance ajoutée après le gel rend la variante concernée
`independence_unknown` jusqu'à révision versionnée du protocole.

## Ordre d'exécution

1. Construire les fixtures des sept variantes, sans observer les sorties des
   autres composants.
2. Construire l'encodeur, le décodeur et les deux interpréteurs séparément.
3. Exécuter le contrôle de lignage, puis l'aller-retour de provenance.
4. Exécuter N1 puis N2 dans les deux directions prévues par le manifest.
5. Comparer les verdicts observés aux verdicts attendus ci-dessus et publier
   les écarts sans les moyenner.

## Règle d'arrêt et décision

La campagne s'arrête dès qu'un des faits suivants est observé :

- une collision, duplication ou extension est absorbée silencieusement ;
- un champ du noyau est perdu ou inventé pendant l'échange ;
- une migration inexpliquée est classée stable ;
- un lignage commun ou incomplet est compté comme indépendant ;
- deux composants partagent une dépendance non déclarée qui détermine leur
  verdict.

Sinon, la revue de portefeuille prononce l'un des trois statuts : `passage`,
`réparation_ciblée` ou `arrêt_reprise`, exactement selon
[`PORTFOLIO_NEXT_STEP.md`](PORTFOLIO_NEXT_STEP.md).

## Portée du résultat

Une exécution conforme ne démontre que le comportement des fixtures, du noyau,
des implémentations et des séparations effectivement testés. Elle ne justifie
ni une intégration produit, ni une indépendance externe, ni une
interopérabilité générale.
