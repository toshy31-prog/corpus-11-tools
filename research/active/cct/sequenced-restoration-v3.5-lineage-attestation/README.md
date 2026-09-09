# CCT-EXEC 3.5 — attestation de la lignée (candidat)

## Lacune traitée

La version 3.4 détecte les collisions entre racines déclarées, sans exiger de preuve indépendante que ces racines correspondent aux unités, événements et générateurs annoncés.

## Gain concret

Le candidat 3.5 lie les trois racines de chaque grappe à deux attestations aveugles antérieures à l'engagement. Leurs racines de preuve, contrôleurs et domaines de panne doivent être distincts. Les racines de preuve ne peuvent pas être réutilisées dans le portefeuille ; aucun contrôleur ou domaine d'attestation ne peut dépasser la moitié de l'ensemble.

Une copie du même artefact sous deux attestations est désormais refusée avec `lineage_attestation_dependent`. Une attestation portant sur une autre racine est refusée de la même manière.

Le statut `bounded_attested_portfolio_lineage_candidate` établit seulement une chaîne de preuve synthétique cohérente. Il ne prouve ni la vérité au-delà des artefacts attestés, ni l'absence d'une cause commune cachée.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v3.5-lineage-attestation/test.mjs
node research/active/cct/sequenced-restoration-v3.5-lineage-attestation/held-out/run-confrontation.mjs
```
