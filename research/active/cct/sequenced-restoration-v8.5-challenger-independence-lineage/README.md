# CCT-EXEC 8.5 — lignée d'indépendance des challengers (candidate)

La 8.4 séparait les challengers par identifiant, contrôleur déclaré et domaine de panne. La 8.5 exige deux audits signés par challenger, fondés sur des artefacts distincts, qui convergent sur son centre de contrôle ultime et ses influences matérielles. Deux challengers partageant un centre de contrôle ou une influence matérielle ne forment plus un quorum.

La confrontation tenue à l'écart donne deux noms et deux domaines de panne à des challengers sous un même contrôle ultime. Le quorum est refusé. Les lignées restent synthétiques et déclarées par des auditeurs ; la couche ne prouve ni leur exhaustivité ni leur indépendance réelle.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
