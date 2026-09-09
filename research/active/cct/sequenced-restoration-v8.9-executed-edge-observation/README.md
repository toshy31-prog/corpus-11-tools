# CCT-EXEC 8.9 — observation de l'arête exécutée (candidate)

La 8.8 vérifiait le manifeste, pas le comportement du moteur. La 8.9 exige deux reçus signés d'observateurs de runtime indépendants, liés au digest du manifeste, au digest d'exécution et aux arêtes effectivement consommées. L'arête obligatoire doit figurer dans cette trace convergente.

La confrontation tenue à l'écart conserve un manifeste conforme mais simule un moteur qui ignore l'arête. L'admission est refusée. Les reçus synthétiques rendent la divergence falsifiable ; ils ne prouvent pas encore la complétude d'une instrumentation réelle.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
