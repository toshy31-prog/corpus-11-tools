# Résultat synthétique v0.3 — dérive sur fenêtres datées appariées

## Résultats exacts

Les deux fenêtres sont construites depuis les dates `issued`. Elles contiennent
chacune dix cas, dont cinq `low`, cinq `high`, avec un horizon de trente jours.

| Fenêtre | Fréquence `low` | Fréquence `high` | Règle | Brier | Fiabilité | Résolution | Incertitude | Perdant |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | `1/5` | `4/5` | `stratified` | `4/25` | `0` | `9/100` | `1/4` | — |
| A | `1/5` | `4/5` | `base_rate` | `1/4` | `0` | `0` | `1/4` | `base_rate` |
| B | `2/5` | `3/5` | `stratified` | `7/25` | `1/25` | `1/100` | `1/4` | `stratified` |
| B | `2/5` | `3/5` | `base_rate` | `1/4` | `0` | `0` | `1/4` | — |

Le perdant s'inverse donc : `base_rate` perd en A et `stratified` perd en B.

## Contrôles matériels

- Les probabilités des règles `base_rate` et `stratified` restent inchangées
  pendant toute la comparaison.
- Exactement deux issues changent : `fictional-f10` passe de `0` à `1` et
  `fictional-f11` passe de `1` à `0`. Aucun autre champ ne change.
- Le calcul d'exécution des prévisions lit uniquement `stratum` et n'accède pas
  à `outcome`. Le scoring lit ensuite les issues pour calculer les scores.
- Cette séparation d'accès ne rend pas la conception indépendante : le registre,
  ses issues et les probabilités rivales restent `co_designed`.
- Le contrôle négatif ajoutant un troisième changement d'issue est rejeté par
  `outcome_change_set_mismatch`.
- Le contrôle négatif modifiant une probabilité est rejeté par
  `probability_table_changed`.
- Toute table autre que la table fermée attendue reçoit
  `candidate_set_incomplete`.

## Conclusion et limites

Le classement est instable sous cette dérive synthétique fermée. Cette seule
inversion ne démontre ni adaptation (`strategic_effect_unknown`), ni résistance
générale à la dérive, ni calibration externe, ni indépendance de conception.

La portée est `formal_exact`. La stabilité externe est `not_claimed`, le
pré-enregistrement prospectif n'est pas démontré, la robustesse générale est
`not_claimed` et l'indépendance reste `independence_unknown`.
