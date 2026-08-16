# CAP.COMMAND_EFFECT_VERIFICATION — provenance opérationnelle

> Statut : capacité récupérée candidate, non établie par sa seule inscription.

## Définition runtime

- statut: recovered_candidate_unvalidated
- classe: recovered_distinct
- source primaire: `archives/legacy/Atlas_3_0_final.zip`, bloc `command_contract`
- appui 10.x: chaîne de transmission du module 04

## Relations

- `CAP.COMMAND_EFFECT_VERIFICATION --requires[critical]--> CAP.CHAIN_TRACING`
- `CAP.COMMAND_EFFECT_VERIFICATION --uses[critical]--> CAP.EFFECTIVE_PRESENCE_ASSESSMENT`

## Reste discriminant

Une commande émise, reçue, exécutée et matériellement vérifiée sont quatre états différents. Le traçage générique ne suffisait pas à empêcher leur fusion.
