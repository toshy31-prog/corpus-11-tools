# CCT-EXEC 8.6 — influence transitive des challengers (candidate)

La 8.5 comparait les contrôles et influences directement déclarés. La 8.6 accepte des arêtes d'influence signées par deux témoins indépendants, construit leur fermeture jusqu'à quatre niveaux et refuse le quorum si les lignées des challengers convergent vers un même centre amont.

La confrontation tenue à l'écart conserve deux influences directes distinctes mais les relie, en deux étapes, à un centre commun. Le quorum est refusé. Cette fermeture reste bornée : une arête omise ou située au-delà de quatre niveaux demeure hors détection.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
