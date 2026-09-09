# État courant

Le pipeline v0.2 reste vérifié : un dossier fictif, trois profils, une
propagation déterministe de taints par flux textuel exact et un automate
minimal de recours sont exécutés. Le cas négatif d'identité renommée ne fournit
pas son propre verdict par override. La détection sémantique libre reste
inconnue.

Le contraste synthétique v0.3 fait varier uniquement
`views.adjudication.retention_days`, de `30` à `31`. Les vues matérialisées, les
taints propagés et les chemins de recours restent identiques. Aucun taint
interdit n'est observé et leur variation est nulle. Les résultats exacts sont :

- `30` : `semantic_disclosure_bounded=true`,
  `recourse_path_complete=true` et aucun dépassement calculé ;
- `31` : `semantic_disclosure_bounded=false`,
  `recourse_path_complete=true` et seul dépassement calculé `31 > 30` pour
  `adjudication`.

`semantic_disclosure_bounded` est un verdict composite de protection de
l'implémentation dont le nom est trompeur ici. Sa valeur négative ne prouve
aucune divulgation. `recourse_authorization_spillover` perd uniquement comme
prédiction de cette branche statique fermée.

Statut scientifique : `pipeline_verified`, `internal_synthetic_only`, validité
externe `not_claimed`, pré-enregistrement prospectif non démontré, robustesse
générale non revendiquée et indépendance `independence_unknown`. Le code et le
résultat sont déterministes et visibles. Le résultat ne prouve ni expiration
temporelle, ni suppression, ni révocation, ni impossibilité de restauration,
ni collusion, ni recours réel.
