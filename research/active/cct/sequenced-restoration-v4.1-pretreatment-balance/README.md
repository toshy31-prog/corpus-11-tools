# CCT-EXEC 4.1 — équilibre prétraitement (candidat)

## Lacune traitée

La version 4.0 rend le tirage reproductible, mais des strates mal construites peuvent encore apparier des grappes matériellement différentes.

## Gain concret

Le candidat 4.1 engage trois covariables antérieures à l'intervention : taux d'événement initial, charge de dépendance et perte d'accès. Leur provenance doit être unique par grappe.

Pour chaque sonde, l'écart dans une strate ne peut dépasser 0,1 sur aucune covariable. Après tirage, la différence moyenne standardisée entre bras ne peut pas dépasser 0,1. Une randomisation parfaitement reproductible est donc refusée si elle laisse subsister un déséquilibre matériel observable.

Le statut `bounded_pretreatment_balance_candidate` ne prouve ni l'équilibre des facteurs non mesurés, ni la validité des covariables, ni leur mesure indépendante sur le terrain.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v4.1-pretreatment-balance/test.mjs
node research/active/cct/sequenced-restoration-v4.1-pretreatment-balance/held-out/run-confrontation.mjs
```
