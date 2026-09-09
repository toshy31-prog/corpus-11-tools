# CCT-EXEC 3.9 — interférence entre grappes (candidat)

## Lacune traitée

La version 3.8 randomise les unités, mais son estimation suppose encore qu'une unité perturbée ne modifie pas le résultat d'une unité témoin.

## Gain concret

Le candidat 3.9 assigne chaque sonde à 40 grappes de même taille, dont 20 par bras. Les effectifs des grappes doivent reproduire ceux des 45 effets mesurés par la sonde. Les racines de grappe et de frontière réseau sont engagées avant observation.

Chaque grappe mesure son exposition au bras opposé. Une exposition supérieure à 5 % bloque la sonde. La confrontation tenue à l'écart conserve l'effet favorable et l'assignation randomisée, mais introduit 20 % d'exposition dans une grappe ; 3.9 refuse alors le plan.

Le statut `bounded_cluster_interference_candidate` ne prouve ni que le réseau d'interférence est complet, ni que l'exposition est correctement mesurée, ni que cette isolation est réalisable sur le terrain.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v3.9-cluster-interference/test.mjs
node research/active/cct/sequenced-restoration-v3.9-cluster-interference/held-out/run-confrontation.mjs
```
