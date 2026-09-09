# CCT-EXEC 6.9 — suspension contestable à expiration automatique (candidate)

La 6.8 ne permet la révocation automatique que sur preuve cryptographique d'équivoque, mais laisse ouverte la protection provisoire face à une compromission de clé, une coercition ou une faute non cryptographique crédible. La 6.9 ajoute une suspension étroite : deux sélecteurs indépendants sur trois signent le même incident, le registre d'observateurs reste inchangé, une voie d'appel et une route de preuve sont obligatoires, et l'observateur redevient automatiquement éligible au quorum après douze ticks au plus.

La confrontation tenue à l'écart tente de renouveler la suspension avec le même incident. Elle est refusée : une accusation répétée ne peut produire une révocation de fait. Cette candidate ne prouve ni la vérité de l'accusation, ni l'équité d'un jugement final, ni l'utilisabilité réelle de l'appel.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
