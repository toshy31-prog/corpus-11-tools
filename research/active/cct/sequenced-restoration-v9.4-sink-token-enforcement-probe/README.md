# CCT-EXEC 9.4 — sonde d'application du jeton aux puits (candidate)

La 9.3 établissait la présence d'un puits dans un registre, pas l'application du contrôle 9.2. La 9.4 soumet chaque puits enregistré à une paire appariée : un effet avec jeton valide doit être accepté et le même effet avec jeton non frappé doit être refusé. Deux observateurs indépendants doivent signer le même résultat et le même plan de sonde.

La confrontation tenue à l'écart conserve le puits dans le registre mais lui fait accepter le jeton non frappé. L'admission est refusée. Cette sonde synthétique ne prouve pas encore que le chemin de test est identique au chemin de production ni que le moteur ne reconnaît pas les sondes.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
