# CCT-EXEC 2.0 candidate — tolérance à la panne d'une voie

Le pont 1.7 couvrait tous les axes en régime nominal, mais une voie pouvait être
l'unique porteuse d'une dette. La candidate 2.0 retire chaque voie à tour de
rôle et recalcule la couverture : un seul axe exposé suffit à refuser le pont
avec `CCT_EVIDENCE_BRIDGE_SINGLE_FAILURE_UNSAFE`.

Cette porte est composée avant les contrôles de structure, présence et lignage.
Elle établit une tolérance structurelle N+1 sur le modèle local, pas un basculement
observé ni une robustesse externe.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
