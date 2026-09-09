# CCT-EXEC 6.8 — révocation bornée par preuve d'équivoque (candidate)

Une procédure de révocation fondée sur l'absence, l'impopularité ou une accusation majoritaire permettrait de purger le registre. Cette candidate n'autorise la révocation automatique que si deux déclarations validement signées par le même observateur portent, pour le même journal, la même taille et le même tick, des racines différentes.

La confrontation tenue à l'écart présente seulement l'absence d'un observateur : 6.8 refuse la révocation. Cette preuve étroite ne couvre pas les fautes non cryptographiques, ne distingue pas une clé compromise de son titulaire et n'établit pas un recours réel.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
