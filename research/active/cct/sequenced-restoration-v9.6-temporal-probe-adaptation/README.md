# CCT-EXEC 9.6 — adaptation temporelle aux sondes (candidate)

La 9.5 contrôlait l'indiscernabilité d'une paire mais pas l'apprentissage de sa cadence. La 9.6 engage un entrelacement de sondes et trafic ordinaire, conserve l'affectation secrète jusqu'à la fin de campagne et compare, pour chaque puits, au moins vingt tentatives non frappées dans une fenêtre précoce et vingt dans une fenêtre tardive. Deux observateurs doivent signer les mêmes comptes.

La confrontation tenue à l'écart fait accepter deux jetons non frappés dans la fenêtre tardive seulement. L'admission est refusée. Le test reste borné à une campagne synthétique ; il ne couvre ni adaptation à très long terme ni corrélation entre campagnes.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
