# CCT-EXEC 4.0 — randomisation de grappes reproductible (candidat)

## Lacune traitée

La version 3.9 engage des étiquettes de bras équilibrées, mais elle ne démontre pas qu'elles résultent réellement du tirage annoncé.

## Gain concret

Le candidat 4.0 forme 20 strates de deux grappes par sonde. Une empreinte de graine est engagée avant assignation. Après révélation, SHA-256 classe les deux racines de chaque strate : la première reçoit le bras témoin et la seconde le bras perturbé.

Le runtime recalcule les 1 800 assignations. Une permutation manuelle qui conserve exactement 20 grappes par bras est désormais refusée avec `cluster_assignment_not_reproducible`.

Le statut `bounded_reproducible_cluster_randomization_candidate` ne prouve ni la dissimulation du tirage sur le terrain, ni la pertinence des strates, ni l'absence d'interférence non mesurée.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v4.0-reproducible-cluster-randomization/test.mjs
node research/active/cct/sequenced-restoration-v4.0-reproducible-cluster-randomization/held-out/run-confrontation.mjs
```
