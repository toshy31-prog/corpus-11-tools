# CCT-EXEC 4.7 — balayage bivarié des seuils (candidat)

## Lacune traitée

La version 4.6 balaie séparément la dépendance et la perte d'accès. Un déséquilibre en damier peut s'annuler dans les deux marges tout en restant fort dans leur intersection.

## Gain concret

Le candidat 4.7 teste toutes les intersections de seuils observés qui conservent au moins cinq grappes par bras. Il borne la recherche à 16 seuils par covariable et 69 120 comparaisons. Les intervalles studentisés portent sur les taux par grappe, avec un coefficient simultané de 6,0 et une bande de ±0,05.

La confrontation fait réussir le balayage unidimensionnel 4.6, puis échouer une intersection dépendance–perte d'accès. Le statut obtenu reste synthétique et ne couvre ni les dimensions d'exposition absentes ni les interactions d'ordre supérieur.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v4.7-bivariate-threshold-scan/test.mjs
node research/active/cct/sequenced-restoration-v4.7-bivariate-threshold-scan/held-out/run-confrontation.mjs
```
