# CCT-EXEC 9.0 — attestation de couverture des branches (candidate)

La 8.9 pouvait établir que deux observateurs voyaient la même trace sans établir que toutes les branches du moteur étaient instrumentées. La 9.0 engage avant exécution un inventaire convergent dérivé par deux méthodes indépendantes : graphe de contrôle statique et sondage comportemental en boîte noire. Deux reçus de runtime distincts doivent ensuite observer exactement cet inventaire pour le même digest d'exécution.

La confrontation tenue à l'écart conserve des reçus convergents mais retire une branche de leurs observations. L'admission est refusée. Ce résultat rend une omission inventoriée falsifiable ; il ne prouve pas qu'une branche dynamique, générée ou dissimulée serait découverte par les deux méthodes dans un moteur réel.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
