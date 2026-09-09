# CCT-EXEC 6.6 — transition conjointe du registre d'observateurs (candidate)

Remplacer instantanément le registre 6.5 peut rompre l'intersection entre décisions successives. Cette candidate exige que l'ancien et le nouveau registre produisent chacun un quorum 3-sur-4 sur le même checkpoint, avec au moins deux signataires communs. La confrontation tenue à l'écart montre que deux quorums individuellement valides restent insuffisants sans cette intersection effective.

La règle préserve la sûreté sous l'hypothèse d'au plus un signataire commun byzantin, mais peut empêcher une rotation urgente. Elle ne prouve ni l'indépendance réelle des membres, ni la légitimité du choix du nouveau registre.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
