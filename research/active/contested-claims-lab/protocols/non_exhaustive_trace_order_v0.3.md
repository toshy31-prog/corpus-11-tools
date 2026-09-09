# CCL-NETO-003 — famille non exhaustive et ordre des traces

## Statut et portée

- version : `v0.3`
- portée : `internal_synthetic_only`
- validité externe : `not_claimed`
- indépendance : `independence_unknown`
- pré-enregistrement démontré : non

Ce protocole vérifie uniquement la sémantique formelle des fonctions existantes
`evaluate` et `apply_revision`. Il ne valide pas généralement la gestion des
désaccords et ne fournit pas une preuve indépendante.

## Construction gelée

L'univers est `{A, B, C, D}` et l'état initial est `{A, B, D}`.

- `claim-alpha` est vrai dans `{A}` ;
- `claim-beta` est vrai dans `{B, C}` ;
- leur union est `{A, B, C}` : `D` est le résidu non couvert.

Deux traces sont appliquées une fois chacune :

- `add-C` : union avec `{C}` ;
- `restrict-A-C-D` : intersection avec `{A, C, D}`.

Les deux permutations doivent produire exactement le même monde final
`{A, C, D}` :

1. `add-C`, puis `restrict-A-C-D` :
   `{A, B, D}` → `{A, B, C, D}` → `{A, C, D}` ;
2. `restrict-A-C-D`, puis `add-C` :
   `{A, B, D}` → `{A, D}` → `{A, C, D}`.

## Prédictions rivales

### Recalcul complet

Le statut de chaque claim est recalculé à partir du monde courant. Les deux
ordres finissent avec `claim-alpha` et `claim-beta` individuellement compatibles.
Dans le second ordre, `claim-beta` passe de compatible à contredit, puis redevient
compatible après l'ajout de `C`.

### Contradiction irréversible

Un claim déjà contredit reste contredit, même si une trace ultérieure réintroduit
un monde où il est vrai. Le premier ordre finit avec les deux claims compatibles ;
le second finit avec `claim-alpha` compatible et `claim-beta` contredit.

Le cas est discriminant parce que les deux rivaux font des prédictions finales
différentes sur `claim-beta` alors que les ensembles finaux sont identiques.

## Vérifications calculées

Le test doit relier les attentes de la fixture aux calculs réalisés par les
fonctions existantes et vérifier :

- chaque état intermédiaire ;
- les deux permutations exactes des mêmes traces ;
- l'égalité exacte des ensembles finaux ;
- le résidu non couvert exact `{D}` ;
- la réouverture de `claim-beta` sous recalcul complet ;
- les prédictions finales distinctes des deux rivaux ;
- le rejet du rival de contradiction irréversible ;
- un cas négatif où une trace modifiée rend les mondes finaux différents.

## Critères d'échec et condition d'arrêt

La v0.3 échoue si au moins une des conditions suivantes est observée :

- un état intermédiaire calculé diffère de la trajectoire gelée ;
- les ordres ne contiennent pas exactement les mêmes traces ;
- les ensembles finaux diffèrent ou ne valent pas `{A, C, D}` ;
- le résidu non couvert ne vaut pas exactement `{D}` ;
- `claim-beta` ne suit pas compatible → contredit → compatible dans le second ordre ;
- les prédictions rivales ne divergent pas sur le second ordre ;
- le cas négatif n'est pas rejeté pour divergence des mondes finaux ;
- une modification de `evaluate` ou `apply_revision` devient nécessaire ;
- un sixième fichier devient nécessaire.

L'exécution s'arrête au premier échec. Aucun élargissement automatique du
protocole ou de la liste fermée n'est autorisé.

## Liste fermée

1. `protocols/non_exhaustive_trace_order_v0.3.md`
2. `fixtures/non_exhaustive_trace_order_v0.3.json`
3. `tests/test_non_exhaustive_trace_order.py`
4. `reports/synthetic/2026-09-09-non-exhaustive-trace-order-v0.3.md`
5. `state/current_state.md`

## Limites scientifiques

- Cas entièrement synthétique et fini.
- Test centré sur la sémantique formelle de `apply_revision` et `evaluate`.
- Une permutation unique de deux traces ne démontre aucune robustesse générale.
- Aucun pré-enregistrement n'est démontré par le dépôt seul.
- Aucune indépendance externe n'est démontrée : `independence_unknown`.
- Aucune validité externe n'est revendiquée : `not_claimed`.
