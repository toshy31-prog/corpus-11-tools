# CCT-EXEC 4.5 — sensibilité aux seuils d'exposition (candidat)

## Lacune traitée

La version 4.4 évalue les placebos dans trois groupes, mais une frontière unique peut être placée juste au-dessus d'une zone déséquilibrée.

## Gain concret

Le candidat 4.5 remplace la frontière ponctuelle par une grille préengagée de trois seuils de charge de dépendance, trois seuils de perte d'accès et leurs neuf intersections. Les 15 groupes produisent 4 050 comparaisons placebo simultanées. Chaque bras doit conserver au moins quatre grappes dans chaque groupe ; les intervalles de Wilson utilisent `z = 4,8` et doivent rester dans ±0,05.

La confrontation place un écart dans les strates 8 à 10, juste sous le seuil central de 4.4. Le contrôle 4.4 l'accepte ; le seuil inférieur de la grille 4.5 le détecte et bloque la sonde.

Le statut `bounded_threshold_sensitivity_candidate` ne prouve ni que la grille couvre toute hétérogénéité continue, ni que les covariables ou placebos représentent correctement l'exposition réelle.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v4.5-threshold-sensitivity/test.mjs
node research/active/cct/sequenced-restoration-v4.5-threshold-sensitivity/held-out/run-confrontation.mjs
```
