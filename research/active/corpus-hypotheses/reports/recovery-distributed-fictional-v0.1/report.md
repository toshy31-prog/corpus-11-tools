# Résultat — récupération distribuée fictive v0.1

> **Artefact retiré et remplacé par la v0.2.** Le verdict v0.1 n'est plus une
> conclusion courante : signature et énumération sont endogènes au même
> générateur, `C_info` est constant par construction, les budgets d'information
> ne sont pas appariés et les `7680` cellules n'étaient pas quotientées avec
> leurs multiplicités.

Date : 2026-08-25

Verdict : **`causal_frontier_absorption`**.

Qualification corrigée : le statut « protocole fixé avant exécution » est une
déclaration de configuration sans verrou temporel indépendant. L'absorption
est une identité endogène au générateur, pas un résultat d'oracle indépendant.
`C_info` est construit, non mesuré, et les trois modèles sont des ablations à
budgets d'information imbriqués. La v0.2 retire ces revendications de la portée.

## Population et oracle

- `7680` mondes fictifs exacts et distincts ;
- `120` horaires par scénario ;
- `16` ensembles de reset examinés par monde ;
- zéro tirage Monte-Carlo ;
- distribution `C_erase_deadline` : `{1: 3420, 2: 4020, 3: 240}` ;
- `C_info=1` dans les `7680` mondes.

## Comparaison des modèles rivaux

| modèle | exact / total | erreur absolue moyenne | sur | sous | strates ambiguës |
|---|---:|---:|---:|---:|---:|
| `graph_only` | 2040 / 7680 | 0.914062 | 5640 | 0 | 4 |
| `schedule_artifact` | 4820 / 7680 | 0.393229 | 2860 | 0 | 1380 |
| `causal_frontier` | 7680 / 7680 | 0.000000 | 0 | 0 | 0 |

Le modèle `causal_frontier` coïncide avec l'énumération de référence issue du
même générateur, monde par monde et pour les ensembles robustes communs à
tous les horaires. Les deux ablations qui ignorent les horloges fusionnent
des mondes dont les coûts exacts diffèrent.

## Non-vacuité, variations et contrôles

- strates discriminées par versions : `1380` ;
- scénarios sensibles à l'ordre : `15` ;
- paires discriminées par le mode de récupération : `900` ;
- invariance `A` / descendant `AB` : `1920` paires, `0` mismatch ;
- contrôle négatif `B` : `0` échec ;
- variation de la position de coupure : `0` mismatch ;
- frontière causale / oracle : `0` mismatch ;
- frontière robuste / oracle tous horaires : `0` mismatch.

Effet de méthode observé :

- durable : `{1: 1380, 2: 2220, 3: 240}` ;
- volatile : `{1: 2040, 2: 1800}`.

Le mode de crash change donc les coûts absolus. En revanche, le reset
maintenu rend la position de coupure inerte à horaire complet fixé, et
l'absorption par la frontière causale survit aux deux modes.

## Conclusion et portée

La séparation récupération/désinscription reste opérationnelle, mais ce
nouvel univers distribué fictif ne produit aucun résidu non standard :
versions, partitions, crash et ordre se compilent exactement dans la
frontière des descendants causaux encore persistants.

Portées : `formal_exact`, `model_internal`, `pipeline_verified`. Le
résultat ne soutient aucune équivalence externe, matérielle, physique ou
subjective. Le buffer indépendant et le clamp jusqu'à la deadline sont
des règles du modèle, non des faits généraux.

Condition de retrait : tout mismatch futur entre oracle opérationnel et
frontière causale, après contrôles valides, retire l'absorption. Pour cette
passe, agrandir la même famille locale ne peut plus changer la conclusion ;
la prochaine action est `stop_same_family_local_expansion`.
