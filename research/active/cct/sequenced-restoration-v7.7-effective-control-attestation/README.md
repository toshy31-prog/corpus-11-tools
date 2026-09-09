# CCT-EXEC 7.7 — attestation du contrôle effectif (candidate)

La 7.6 distinguait les découvreurs par identité déclarée, contrôleur et domaine de panne. La 7.7 exige, pour chaque membre d'un quorum de contestation, deux attestations signées et indépendantes de son centre de contrôle ultime, adossées à des artefacts distincts. Si deux découvreurs convergent vers le même centre effectif, leur quorum nominal s'effondre et ne peut plus opposer son veto. Si les auditeurs divergent ou manquent, la conclusion reste non établie.

La confrontation tenue à l'écart donne deux identités à un même centre de contrôle : la réparation n'est plus bloquée par ce faux quorum. Les fixtures éprouvent la règle, mais ne prouvent pas que des relations de contrôle secrètes seraient effectivement découvertes dans le monde réel.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
