# Résultat — famille non exhaustive et ordre des traces v0.3

## Statut et portée

- campagne : `CCL-NETO-003`
- portée : `internal_synthetic_only`
- validité externe : `not_claimed`
- indépendance : `independence_unknown`
- pré-enregistrement démontré : non
- robustesse générale revendiquée : non

Ce rapport décrit un test formel local des fonctions existantes `evaluate` et
`apply_revision`. Il ne démontre pas qu'une règle de révision est supérieure
dans des situations réelles.

## Résultat calculé

Les deux permutations utilisent exactement les mêmes traces : `add-C` et
`restrict-A-C-D`.

1. `add-C`, puis `restrict-A-C-D` :
   `{A, B, D}` → `{A, B, C, D}` → `{A, C, D}` ;
2. `restrict-A-C-D`, puis `add-C` :
   `{A, B, D}` → `{A, D}` → `{A, C, D}`.

Les deux ordres atteignent exactement le même état final `{A, C, D}`. La famille
de claims reste non exhaustive : `D` n'appartient à aucun claim et constitue le
résidu non couvert exact `{D}`.

Dans le second ordre, `claim-beta` suit la trajectoire calculée suivante :

`individually_compatible` → `contradicted` → `individually_compatible`.

Le recalcul complet rouvre donc `claim-beta` après l'ajout de `C`. Le rival à
contradiction irréversible le maintient au contraire comme contredit dans ce
second ordre, alors qu'il le conserve compatible dans le premier. Les deux
rivaux divergent donc malgré des mondes finaux identiques.

Le rival à contradiction irréversible perd uniquement dans cette paire fermée.
Ce résultat ne démontre ni sa faiblesse générale ni la supériorité générale du
recalcul complet.

## Contrôle négatif

Le contrôle négatif remplace la restriction par une intersection avec `{A, D}`.
Les deux ordres produisent alors respectivement `{A, D}` et `{A, C, D}`. Le test
le rejette exactement par `ValueError("final_world_sets_differ")`.

Sortie observée du test v0.3 :

```json
{"campaign_id": "CCL-NETO-003", "external_validity": "not_claimed", "independence_status": "independence_unknown", "negative_case_rejected": true, "orders_checked": 2, "scope": "internal_synthetic_only", "valid": true}
```

Le test v0.2 directement dépendant repasse également :

```text
PASS contested claims v0.2: individual/joint/revision separated; duplicate ids rejected
```

## Historique de développement — non scientifique

Ces corrections concernent le raccordement du nouveau test et ne constituent
pas des résultats sur les claims :

- le helper `statuses` a été aligné sur la table directe `{identifiant: statut}`
  renvoyée par `evaluate` ;
- l'appel final à `evaluate` convertit en ensemble la liste utilisée pour la
  comparaison et l'affichage ;
- le contrôle négatif saute uniquement les trois trajectoires positives
  déclarées afin d'atteindre l'invariant `final_world_sets_differ`. Les contrôles
  des traces, de l'univers et les calculs par `apply_revision` restent actifs.

## Limites et condition de retrait

- Cas fini, entièrement synthétique et construit dans le dépôt.
- Une seule paire de traces et ses deux permutations sont testées.
- Aucun pré-enregistrement n'est démontré rétrospectivement.
- Aucune indépendance externe n'est démontrée : `independence_unknown`.
- Aucune validité externe n'est revendiquée : `not_claimed`.
- Aucune robustesse générale n'est revendiquée.
- Le résultat doit être retiré si les mondes finaux positifs divergent, si `D`
  cesse d'être le résidu exact, si `claim-beta` ne se rouvre plus ou si le cas
  négatif n'est plus rejeté exactement par `final_world_sets_differ`.
