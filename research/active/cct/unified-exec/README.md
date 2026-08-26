# CCT-EXEC 1.0 candidate

Cette couche compose CCT-NCE 0.14 avec deux invariants auparavant non exécutés :

- **I13** — une alternance peut changer les politiques, jamais abolir dignité,
  statut vital, opposition ou recours ;
- **I15** — sous risques composés, une action doit respecter le budget partagé,
  ne léser aucun axe et protéger tous les axes confirmés comme menacés.

Le runtime déclare l'infaisabilité lorsqu'aucune action complète n'existe. Ce
refus évite une compensation silencieuse, mais ne constitue pas une capacité
matérielle réussie.

```bash
node test.mjs
node run-adversarial-development.mjs
node verify-freeze.mjs
```

Les huit fixtures adverses sont internes et réservées au développement. Elles
ne peuvent pas accepter la candidate ni établir sa robustesse.
