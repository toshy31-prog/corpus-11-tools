# État courant

Le score initial `0,1` reste exact pour ses quatre lignes mais ne suffisait pas
à identifier une calibration. Dans le registre fictif daté de vingt lignes, la
règle stratifiée obtient `4/25`, la surconfiance `73/400` et la base `1/4` ; la
décomposition exacte explique l’ordre. Portée `formal_exact`.

La description « générateur indépendant » est `weakened` : la fonction ne lit
pas les probabilités rivales à l'exécution, mais les issues et les rivaux sont
co-conçus dans le même fichier. Le résultat établit une séparation de code, pas
une indépendance d'évidence.

## Contraste v0.3 sur deux fenêtres

Les fenêtres A et B sont construites depuis les dates `issued`. Elles contiennent
chacune dix cas, cinq `low`, cinq `high`, avec des horizons identiques de trente
jours. Les probabilités restent inchangées pendant la comparaison. Seules deux
issues varient : `fictional-f10` passe de `0` à `1` et `fictional-f11` de `1` à
`0`. Aucun autre champ ne change.

En A, les fréquences sont `(low=1/5, high=4/5)`. `stratified` obtient Brier
`4/25`, fiabilité `0`, résolution `9/100`, incertitude `1/4` ; `base_rate`
obtient Brier `1/4`, fiabilité `0`, résolution `0`, incertitude `1/4`.
`base_rate` perd.

En B, les fréquences sont `(low=2/5, high=3/5)`. `stratified` obtient Brier
`7/25`, fiabilité `1/25`, résolution `1/100`, incertitude `1/4` ; `base_rate`
obtient Brier `1/4`, fiabilité `0`, résolution `0`, incertitude `1/4`.
`stratified` perd.

Le calcul d'exécution des prévisions n'accède pas à `outcome`; le scoring lit
ensuite les issues. Le registre reste néanmoins `co_designed`. Les contrôles
négatifs rejettent exactement un troisième changement d'issue par
`outcome_change_set_mismatch` et une modification de probabilité par
`probability_table_changed`.

La conclusion est limitée à une instabilité du classement sous cette dérive
synthétique fermée. Portée `formal_exact`; stabilité externe `not_claimed`;
adaptation comportementale `strategic_effect_unknown`; pré-enregistrement
prospectif non démontré; robustesse générale `not_claimed`; indépendance
`independence_unknown`. Aucune adaptation, résistance générale à la dérive,
calibration externe ou indépendance de conception n'est revendiquée.
