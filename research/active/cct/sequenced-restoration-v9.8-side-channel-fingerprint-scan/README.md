# CCT-EXEC 9.8 — balayage des empreintes par canaux latéraux (candidate)

La 9.7 comparait une empreinte déclarée. La 9.8 mesure sept canaux préengagés entre sondes et trafic ordinaire : cache, code d'erreur, ordre, route réseau, taille, contention et temps. Chaque bras compte au moins trente observations et la différence standardisée absolue doit rester au plus à 0,1 sous deux audits concordants.

La confrontation tenue à l'écart place une différence temporelle de 0,32 sans modifier l'empreinte déclarée de la 9.7. L'admission est refusée. Le catalogue reste borné et l'analyse univariée ; un canal absent ou une liaison non linéaire peut encore échapper au test.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
