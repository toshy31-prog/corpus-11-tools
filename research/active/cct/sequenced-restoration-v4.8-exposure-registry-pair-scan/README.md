# CCT-EXEC 4.8 — registre des expositions et balayage des paires (candidat)

## Lacune traitée

La version 4.7 ne balayait que deux des trois covariables prétraitement déjà mesurées. Une variable pouvait donc être conservée dans les données mais omise des interactions.

## Gain concret

Le candidat 4.8 ferme le registre sur le taux d'événements initial, la charge de dépendance et la perte d'accès. Le registre déclaré doit correspondre exactement aux mesures, puis les trois paires sont balayées. La recherche reste bornée à 16 seuils par covariable et 207 360 comparaisons, avec des intervalles studentisés de coefficient 6,4.

La confrontation fait réussir 4.7 tout en omettant le taux initial du registre déclaré. La sélection est désormais bloquée avant toute conclusion distributive.

Le statut `bounded_exposure_registry_pair_scan_candidate` ne prouve pas que ces trois variables couvrent les expositions non mesurées ou les interactions d'ordre supérieur.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v4.8-exposure-registry-pair-scan/test.mjs
node research/active/cct/sequenced-restoration-v4.8-exposure-registry-pair-scan/held-out/run-confrontation.mjs
```
