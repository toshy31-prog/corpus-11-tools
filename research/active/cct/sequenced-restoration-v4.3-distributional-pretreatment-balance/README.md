# CCT-EXEC 4.3 — équilibre prétraitement distributif (candidat)

## Lacune traitée

Les versions 4.1 et 4.2 contrôlent l'équilibre moyen et les placebos agrégés. Des écarts opposés entre populations peu et fortement exposées peuvent cependant s'annuler dans la moyenne.

## Gain concret

Le candidat 4.3 dérive trois groupes d'exposition à partir des covariables prétraitement déjà engagées : charge de dépendance élevée, perte d'accès élevée et exposition composée. Chaque groupe doit compter au moins huit grappes, dont quatre par bras. Pour chacune des trois covariables, la différence moyenne standardisée entre bras doit rester inférieure ou égale à 0,1 dans chaque groupe.

Une confrontation construit deux déséquilibres de sens opposé. Leur moyenne globale s'annule, mais le groupe à forte charge de dépendance échoue et bloque la sélection du pont.

Le statut `bounded_distributional_pretreatment_balance_candidate` ne prouve ni que ces trois groupes épuisent les formes d'exposition, ni l'équilibre de facteurs non mesurés, ni la représentativité du terrain.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v4.3-distributional-pretreatment-balance/test.mjs
node research/active/cct/sequenced-restoration-v4.3-distributional-pretreatment-balance/held-out/run-confrontation.mjs
```
