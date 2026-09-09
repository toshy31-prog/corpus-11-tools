# CCT-EXEC 8.2 — audit d'équivalence du placebo (candidate)

La 8.1 exigeait des retraits factices sans établir leur comparabilité. La 8.2 impose deux audits signés du protocole réel et du placebo. Ils doivent s'accorder sur le digest des caractéristiques invariantes et déclarer une seule différence : l'assignation du retrait d'influence. Toute différence supplémentaire, notamment la visibilité de l'observateur, invalide le placebo.

La confrontation tenue à l'écart rend le placebo visible à l'observateur alors que la sonde réelle ne l'est pas. Les fixtures éprouvent cette barrière ; elles ne prouvent pas l'absence de caractéristiques non mesurées.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
