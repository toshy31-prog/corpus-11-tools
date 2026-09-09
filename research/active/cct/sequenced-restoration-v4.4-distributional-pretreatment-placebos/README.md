# CCT-EXEC 4.4 — placebos prétraitement distributifs (candidat)

## Lacune traitée

La version 4.3 contrôle les covariables dans les groupes exposés, mais la version 4.2 mesure encore les placebos par bras entier. Des différences opposées entre groupes peuvent donc s'annuler.

## Gain concret

Le candidat 4.4 engage avant assignation trois comptes placebo pour chacune des 3 600 grappes. Il les agrège ensuite selon le bras tiré dans les trois groupes d'exposition définis par 4.3. Les 810 comparaisons utilisent des intervalles de Wilson simultanés avec `z = 4,4`. Toute borne sortant de ±0,05 bloque la sonde. Les racines de source des 10 800 comptes doivent être uniques.

La confrontation tenue à l'écart construit des différences de sens opposé entre moitiés d'exposition. Le contrôle agrégé de 4.2 les accepte ; 4.4 refuse le groupe à forte charge de dépendance.

Le statut `bounded_distributional_pretreatment_placebo_candidate` ne prouve ni l'exhaustivité des groupes, ni la validité des placebos, ni l'aveuglement réel ou la représentativité du terrain.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v4.4-distributional-pretreatment-placebos/test.mjs
node research/active/cct/sequenced-restoration-v4.4-distributional-pretreatment-placebos/held-out/run-confrontation.mjs
```
