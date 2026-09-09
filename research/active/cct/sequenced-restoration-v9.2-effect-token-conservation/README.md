# CCT-EXEC 9.2 — conservation des jetons d'effet (candidate)

La 9.1 pouvait être contournée par une voie qui évitait aussi les observateurs d'entrée. La 9.2 lie chaque effet observé à un jeton d'admission à usage unique. Deux témoins de frappe et deux témoins placés aux puits d'effet signent des ensembles liés au même digest d'exécution. Un effet sans jeton frappé ou la réutilisation d'un jeton bloque l'admission.

La confrontation tenue à l'écart injecte une exécution latérale qui atteint un puits avec un jeton non frappé. Elle est refusée. Le protocole ne détecte pas encore un puits d'effet entièrement absent du registre ni une exécution latérale sans effet observable.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
