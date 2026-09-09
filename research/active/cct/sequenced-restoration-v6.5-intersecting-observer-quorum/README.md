# CCT-EXEC 6.5 — quorum intersectant d'observateurs (candidate)

Deux branches silencieusement séparées peuvent chacune présenter deux observateurs cohérents et passer 6.4. Cette candidate gèle un registre de quatre identités, clés, contrôleurs et domaines de panne, puis exige trois signatures concordantes. Deux quorums valides partagent donc au moins deux membres ; sous l'hypothèse explicite d'au plus un observateur byzantin, deux branches incompatibles ne peuvent toutes deux être autorisées.

La confrontation tenue à l'écart construit deux paires disjointes qui passent séparément 6.4 ; aucune n'atteint 6.5. Le mécanisme privilégie la sûreté et peut bloquer pendant une partition. Il ne garantit rien si deux observateurs ou davantage peuvent signer des branches rivales, ni si le registre est capturé.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
