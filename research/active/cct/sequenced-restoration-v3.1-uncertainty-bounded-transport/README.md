# CCT-EXEC 3.1 — transport borné par l'incertitude (candidat)

## Lacune traitée

La version 3.0 compare des estimations ponctuelles à des seuils de transport. Une petite étude peut donc passer lorsque son estimation tombe sous le seuil, même si l'incertitude compatible avec ses comptes le franchit largement.

## Gain concret

Le candidat 3.1 engage avant les résultats une règle d'incertitude simultanée. Les 36 marges exigent chacune deux proportions dans deux contextes et les neuf risques une proportion dans deux contextes, soit 162 intervalles élémentaires. Une correction familiale à 95 % fixe `z = 3,62`. Chaque proportion reçoit un intervalle de Wilson ; les bornes d'une marge sont obtenues en soustrayant les bornes opposées du candidat et du rival.

Le transport n'est qualifié que si l'intervalle complet de chaque marge reste dans la tolérance relative de 20 % de 3.0 et si l'intervalle complet de chaque risque reste dans sa tolérance absolue de 0,1. Le protocole exige exactement deux contextes par signal : en ajouter après coup invalide la famille préengagée. Une estimation ponctuelle admissible peut donc être refusée faute de précision.

Le statut `bounded_uncertainty_qualified_transport_candidate` ne prouve pas que l'échantillonnage est aléatoire ou indépendant, que les construits sont valides dans le monde réel, ni que les résultats se transportent au-delà des contextes déclarés.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v3.1-uncertainty-bounded-transport/test.mjs
node research/active/cct/sequenced-restoration-v3.1-uncertainty-bounded-transport/held-out/run-confrontation.mjs
```
