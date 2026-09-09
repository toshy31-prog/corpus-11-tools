# CCT-EXEC 8.1 — contrôle de l'effet de méthode (candidate)

La 8.0 attribuait au retrait d'une influence tout changement observé pendant la sonde. La 8.1 exige deux retraits factices appariés, conduits selon deux plans indépendants. Si le protocole factice reproduit le changement, l'attribution au retrait est refusée. Seules des sondes réelles concordantes accompagnées de sondes factices stables conservent l'invalidation du quorum.

La confrontation tenue à l'écart fait changer la décision sous retrait réel et factice. Les fixtures éprouvent le biais de méthode local ; elles ne prouvent pas l'équivalence du placebo dans un terrain réel.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
