# CCT-EXEC 4.6 — balayage des seuils observés (candidat)

## Lacune traitée

La grille 4.5 teste quinze groupes fixes. Elle ne couvre pas une rupture située hors de ses frontières, notamment sous son seuil le plus bas.

## Gain concret

Le candidat 4.6 dérive tous les seuils observés de charge de dépendance et de perte d'accès qui conservent au moins dix grappes par bras. Il limite la recherche à 21 groupes par covariable et à 11 340 comparaisons avant lecture des résultats. Dans l'exercice complet, 22 groupes produisent 5 940 comparaisons. Les intervalles simultanés utilisent `z = 5,3` et restent soumis à la bande de ±0,05.

La confrontation place un écart dans la première strate, sous la grille 4.5. Cette grille l'accepte ; le seuil observé 0,0125 le détecte et bloque la sonde.

Le statut `bounded_observed_threshold_scan_candidate` ne couvre pas encore les frontières continues à deux dimensions, les variables d'exposition absentes ou la validité des mesures sur le terrain.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v4.6-observed-threshold-scan/test.mjs
node research/active/cct/sequenced-restoration-v4.6-observed-threshold-scan/held-out/run-confrontation.mjs
```
