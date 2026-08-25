# Résultat — récupération distribuée fictive v0.2

Date : 2026-08-25

Verdict : **`endogenous_causal_signature_identity`** (`formal_exact`).

Le statut du protocole est auto-déclaré dans la configuration, sans
verrou temporel indépendant.

## Population et énumération endogène

- `7680` cellules fictives exactes et distinctes ;
- `120` horaires par scénario ;
- `16` ensembles de reset examinés par cellule ;
- zéro tirage Monte-Carlo ;
- distribution `C_erase_deadline` : `{'1': 3420, '2': 4020, '3': 240}` ;
- quotient : `2160` signatures, somme des multiplicités `7680`.

L'énumération de référence et la signature causale dérivent du même
générateur déclaré. Leur égalité est un théorème endogène, pas une
confirmation par un oracle indépendant. L'axe `C_info` non mesuré est retiré.

## Ablations à budgets d'information imbriqués

| ablation | exact / total | erreur absolue moyenne | sur | sous | strates ambiguës |
|---|---:|---:|---:|---:|---:|
| `graph_only` | 2040 / 7680 | 0.914062 | 5640 | 0 | 4 |
| `schedule_artifact` | 4820 / 7680 | 0.393229 | 2860 | 0 | 1380 |
| `causal_frontier` | 7680 / 7680 | 0.000000 | 0 | 0 | 0 |

Les budgets ne sont pas appariés : `schedule_artifact` reçoit horaire
et crash en plus de `graph_only`, puis `causal_frontier` reçoit aussi
l'ascendance vectorielle. Le classement isole une information nécessaire
dans ce générateur; il ne mesure pas une supériorité équitable de méthode.

## Non-vacuité, variations et contrôles

- strates discriminées par versions : `1380` ;
- scénarios sensibles à l'ordre : `15` ;
- paires discriminées par le mode de récupération : `900` ;
- invariance `A` / descendant `AB` : `1920` paires, `0` mismatch ;
- contrôle négatif `B` : `0` échec ;
- variation de la position de coupure : `0` mismatch ;
- signature causale / énumération de référence : `0` mismatch ;
- signature robuste / énumération tous horaires : `0` mismatch ;
- égalité avec le quotient recalculé depuis les 7680 cellules : `True`.

Effet de méthode observé :

- durable : `{'1': 1380, '2': 2220, '3': 240}` ;
- volatile : `{'1': 2040, '2': 1800}`.

Le mode de crash change donc les coûts absolus. En revanche, le reset
maintenu rend la position de coupure inerte à horaire complet fixé, et
l'identité endogène de signature survit aux deux modes.

## Conclusion et portée

La séparation récupération/désinscription reste opérationnelle, mais ce
nouvel univers distribué fictif établit seulement que versions, partitions,
crash et ordre se compilent exactement dans la signature causale déclarée.

Portées : `formal_exact`, `pipeline_verified`. Revendications non soutenues :
oracle indépendant, coût de récupération d'information mesuré, équivalence
externe, mémoire physique ou subjective. Le buffer et le clamp jusqu'à la
deadline sont des règles du générateur, non des faits généraux.

Condition de retrait : tout mismatch futur entre énumération de transition et
signature causale, après contrôles valides, retire l'identité. Pour cette
passe, agrandir la même famille locale ne peut plus changer la conclusion ;
la prochaine action est `stop_same_family_local_expansion`.
