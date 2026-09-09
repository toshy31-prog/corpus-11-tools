# CCT-EXEC 9.3 — clôture du registre des puits d'effet (candidate)

La 9.2 ne pouvait contrôler que les puits déjà déclarés. La 9.3 exige deux inventaires indépendants liés au même exécutable : graphe des interfaces externes et sondage des variations d'état. Ils doivent converger, puis deux gardiens de domaines distincts scellent un registre exactement égal à cet inventaire.

La confrontation tenue à l'écart retire du registre un puits trouvé par les deux méthodes. L'admission est refusée. La convergence ne prouve pas l'exhaustivité : une omission commune aux deux méthodes reste possible, et la 9.3 n'établit pas encore que chaque puits enregistré porte effectivement le contrôle de jeton de la 9.2.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
