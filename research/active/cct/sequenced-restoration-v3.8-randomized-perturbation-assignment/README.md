# CCT-EXEC 3.8 — assignation randomisée des perturbations (candidat)

## Lacune traitée

La version 3.7 observe directement les deux bras, mais elle ne garantit pas qu'ils proviennent de populations comparables. Une sélection différente ou une perte de suivi asymétrique peut fabriquer l'effet.

## Gain concret

Le candidat 3.8 engage une assignation randomisée par blocs pour chaque comparaison. La graine est engagée par empreinte puis révélée ; au moins 20 blocs sont requis. Le plan, l'allocation réelle et les effectifs observés sont réconciliés.

Un bras est refusé au-delà de 5 % d'attrition ou si l'écart entre bras dépasse un point de pourcentage. La confrontation tenue à l'écart conserve un effet favorable mais ne réobserve que la moitié des unités assignées : le plan est désormais bloqué.

Le statut `bounded_randomized_perturbation_assignment_candidate` ne prouve ni la dissimulation réelle de l'allocation, ni l'absence d'interférence entre unités, ni la représentativité de l'échantillon.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v3.8-randomized-perturbation-assignment/test.mjs
node research/active/cct/sequenced-restoration-v3.8-randomized-perturbation-assignment/held-out/run-confrontation.mjs
```
