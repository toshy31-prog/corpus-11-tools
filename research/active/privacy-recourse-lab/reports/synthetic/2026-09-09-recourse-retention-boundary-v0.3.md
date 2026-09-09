# Résultat synthétique v0.3 — frontière déclarative de rétention

## Résultat observé

Le test compare deux copies du même profil. Seul
`views.adjudication.retention_days` varie : `30` dans la première et `31` dans
la seconde. Les résultats calculés sont exactement :

| `retention_days` | `semantic_disclosure_bounded` | `recourse_path_complete` |
| ---: | :---: | :---: |
| 30 | `true` | `true` |
| 31 | `false` | `true` |

Les vues matérialisées, les taints propagés et les chemins de recours sont
identiques entre les deux profils. Aucun taint interdit n'est observé et leur
variation est nulle. À `30`, aucun dépassement n'est calculé. À `31`, le seul
dépassement calculé est `31 > 30` pour l'audience `adjudication`.

`semantic_disclosure_bounded` est un verdict composite de protection produit
par l'implémentation et son nom est trompeur pour ce contraste. Sa valeur
`false` à `31` établit ici seulement le dépassement de la limite déclarative de
rétention. Elle ne prouve aucune divulgation.

## Rivaux et conclusion bornée

Dans cette branche statique fermée, `recourse_authorization_spillover` perd
comme prédiction : le chemin de recours reste complet dans les deux profils,
mais le verdict composite de protection change lorsque
`retention_days > max_retention_days`. Ce résultat ne valide pas le rival
restant au-delà de ce contraste.

Toute autre issue aurait produit `candidate_set_incomplete`.

## Limites scientifiques

La portée est `pipeline_verified` et `internal_synthetic_only`. La validité
externe est `not_claimed`, le pré-enregistrement prospectif n'est pas démontré,
la robustesse générale n'est pas revendiquée et l'indépendance reste
`independence_unknown`.

L'exécution est déterministe et le code comme le résultat sont visibles. Ce
test statique ne constitue pas une preuve d'expiration temporelle, de
suppression, de révocation, d'impossibilité de restauration, de collusion ou
de recours réel.
