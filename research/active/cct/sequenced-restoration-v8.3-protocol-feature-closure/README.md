# CCT-EXEC 8.3 — fermeture du catalogue de caractéristiques du protocole (candidate)

La 8.2 liait les audits aux caractéristiques déclarées, mais permettait encore qu'une même caractéristique soit omise des deux descriptions. La 8.3 préengage un catalogue minimal, exige des manifestes réel et placebo dont les clés correspondent exactement à ce catalogue, vérifie que seule l'assignation du retrait diffère, puis lie deux attestations signées aux deux manifestes et au catalogue.

La confrontation tenue à l'écart omet des deux côtés la visibilité de la consigne opérateur. Cette omission bloque désormais l'attribution. La fermeture reste bornée au catalogue préengagé : elle ne prouve pas l'absence de caractéristiques extérieures à celui-ci.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
