# CCT-EXEC 1.9 candidate — lignage des exercices

La présence locale 1.8 ne suffisait pas : plusieurs rapports pouvaient être
produits par un même témoin, domaine de panne et support racine. Cette candidate
trace ces trois porteurs pour chaque exercice. Un lignage absent donne
`independence_unknown`; un lignage unique donne `substantially_dependent`; deux
valeurs distinctes pour chaque porteur donnent seulement
`materially_independent_exercise_candidate`.

Elle ne prouve pas l'indépendance de fait : elle empêche seulement de compter
plusieurs rapports redondants comme plusieurs soutiens. Le runtime applique
désormais ce verdict à la sélection : un pont dépendant ou au lignage inconnu
provoque `CCT_EVIDENCE_BRIDGE_LINEAGE_INSUFFICIENT` au lieu d'être transmis à
la couche 1.8. La sélection compose l'éligibilité structurelle 1.7 et le lignage
1.9 avant le tri, afin qu'un candidat invalide placé en premier ne puisse pas
masquer un pont admissible.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
