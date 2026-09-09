# CCT-EXEC 10.0 — sélection de modèles préengagée (candidate)

La 9.9 signait la famille mais omettait initialement la configuration du modèle. Cette omission est corrigée : chaque reçu lie désormais un digest de configuration. La 10.0 exige en plus un manifeste scellé par deux gardiens avant l'évaluation, exactement égal aux familles, évaluateurs, données d'entraînement engagées et configurations effectivement évaluées.

La confrontation tenue à l'écart remplace après coup la configuration de l'arbre. L'admission est refusée. Le mécanisme ne prouve pas encore que l'entraînement a suivi le code engagé ni qu'aucune recherche non enregistrée n'a précédé le manifeste.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
