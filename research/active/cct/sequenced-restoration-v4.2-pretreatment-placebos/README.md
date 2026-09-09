# CCT-EXEC 4.2 — placebos préintervention (candidat)

## Lacune traitée

La version 4.1 équilibre trois covariables nommées, mais un déséquilibre latent peut rester visible dans des résultats antérieurs sans apparaître dans cette liste.

## Gain concret

Le candidat 4.2 engage trois résultats placebo par sonde avant le tirage : événement retardé, perte d'accès antérieure et panne sans rapport. Deux chaînes aveugles et distinctes mesurent les comptes avant assignation, puis les données sont regroupées selon les bras tirés.

Les 270 différences utilisent des intervalles simultanés avec `z = 4,0`. Toute borne sortant de ±0,05 bloque la sonde. Une différence placebo de 0,1 est ainsi refusée malgré l'équilibre des covariables de 4.1.

Le statut `bounded_pretreatment_placebo_candidate` ne prouve ni l'équilibre de tous les facteurs non mesurés, ni la validité des placebos, ni l'aveuglement réel sur le terrain.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v4.2-pretreatment-placebos/test.mjs
node research/active/cct/sequenced-restoration-v4.2-pretreatment-placebos/held-out/run-confrontation.mjs
```
