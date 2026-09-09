# Protocole v0.3 — frontière déclarative de rétention du recours

## Portée et réutilisation

Ce protocole réutilise sans modification `assess`, `materialize` et
`propagate_taints` depuis `tests/test_taint_recourse_model.py`. Il part du
profil `graduated` de `fixtures/taint_recourse_v0.2.json`.

La portée est `pipeline_verified`, `internal_synthetic_only`. La validité
externe est `not_claimed`, le pré-enregistrement prospectif n'est pas démontré
et l'indépendance reste `independence_unknown`.

Liste fermée v0.3 :

1. `protocols/2026-09-09-recourse-retention-boundary-v0.3.md` ;
2. `fixtures/recourse_retention_boundary_v0.3.json` ;
3. `tests/test_recourse_retention_boundary.py` ;
4. `reports/synthetic/2026-09-09-recourse-retention-boundary-v0.3.md` ;
5. `state/current_state.md`.

Seuls les trois premiers fichiers sont autorisés avant le passage des tests et
la contre-revue.

## Contraste gelé

Deux copies du profil `graduated` sont comparées. Leur seule différence admise
est `views.adjudication.retention_days` :

- profil `retention_30` : valeur `30` ;
- profil `retention_31` : valeur `31`.

Le maximum déclaré pour `adjudication` reste `30`. Le dossier synthétique, les
champs de chaque audience, les valeurs matérialisées, les taints déclarés et
propagés, les taints interdits et le chemin de recours restent identiques.

Prédictions gelées :

- `retention_30` : `semantic_disclosure_bounded=true` et
  `recourse_path_complete=true` ;
- `retention_31` : `semantic_disclosure_bounded=false` et
  `recourse_path_complete=true`.

`semantic_disclosure_bounded` est le verdict composite de protection produit
par l'implémentation. Sa valeur `false` pour `retention_31` ne constitue pas
l'observation d'une divulgation. Le protocole observe uniquement que la branche
`retention_days > max_retention_days` rend ce verdict composite négatif.

## Rivaux

`purpose_scoped_retention` prédit la séparation exacte des deux profils : le
recours reste complet dans les deux cas, tandis que le verdict composite de
protection devient négatif au-dessus du maximum déclaré.

`recourse_authorization_spillover` prédit que le verdict composite reste
positif tant que le recours est complet. Il peut perdre uniquement si les deux
profils ne diffèrent que sur la frontière déclarative `30/31`, si tous les
autres observables restent égaux et si les résultats sont exactement ceux
gelés ci-dessus.

Toute autre issue reçoit la classification `candidate_set_incomplete`.

## Contrôles et conditions d'arrêt

Le test doit établir computationnellement :

- l'unique différence de profil ;
- l'égalité exacte des vues matérialisées ;
- l'égalité exacte des taints propagés ;
- l'égalité exacte des chemins de recours ;
- une variation nulle des taints interdits ;
- l'absence de taint interdit dans les deux profils ;
- aucun dépassement de maximum à `30` ;
- un seul dépassement à `31`, sur `adjudication`, avec maximum `30` ;
- les deux sorties attendues exactes.

Arrêter sans réparation si v0.2 échoue, si une fonction réutilisée doit être
modifiée, si un autre champ varie, si un taint interdit varie ou intervient, si
le chemin de recours change, ou si une sortie diffère des prédictions gelées.

Ce contraste porte uniquement sur une frontière déclarative dans une
implémentation déterministe et visible. Il ne mesure ni politique appliquée,
ni comportement institutionnel, ni événement de divulgation.
