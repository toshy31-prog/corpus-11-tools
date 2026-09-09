# CCT-EXEC 10.2 — registre borné de recherche de modèles (candidate)

La 10.1 liait les artefacts retenus mais pas les essais parallèles abandonnés. La 10.2 dérive du manifeste le digest exact de chaque travail autorisé et exige que deux compteurs de calcul indépendants observent exactement cet ensemble pendant la fenêtre d'entraînement.

La confrontation tenue à l'écart ajoute un essai de modèle non publié. Les deux compteurs le voient et l'admission est refusée. La capacité reste bornée au domaine de calcul instrumenté : un matériel hors registre ou un calcul non mesuré reste une lacune explicite.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
