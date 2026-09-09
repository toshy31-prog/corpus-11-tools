# CCT-EXEC 10.1 — lignée de l'exécution d'entraînement (candidate)

La 10.0 scellait une sélection sans lier le runtime exécuté. Son manifeste engage désormais aussi le digest du runtime. La 10.1 exige deux reçus indépendants qui relient ce runtime, le manifeste, les engagements d'entraînement, les configurations et les artefacts de modèles produits.

La confrontation tenue à l'écart conserve le manifeste mais entraîne un modèle avec une autre configuration. L'admission est refusée. Ces reçus synthétiques ne constituent pas une attestation matérielle et ne détectent pas encore une recherche parallèle entièrement hors observation.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
