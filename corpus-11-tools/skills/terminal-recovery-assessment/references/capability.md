# CAP.TERMINAL_RECOVERY_ASSESSMENT — provenance opérationnelle

> Statut : capacité récupérée candidate, non établie par sa seule inscription.

## Définition runtime

- statut: recovered_candidate_unvalidated
- classe: recovered_composite
- source primaire: `archives/legacy/Atlas_3_0_final.zip`, blocs `terminal` et `reaction_recovery`

## Relations

- `CAP.TERMINAL_RECOVERY_ASSESSMENT --requires[critical]--> CAP.FIELD_CAPACITY_ASSESSMENT`
- `CAP.TERMINAL_RECOVERY_ASSESSMENT --uses[critical]--> CAP.REPAIR_SUFFICIENCY`

## Reste discriminant

Un arrêt nominal ne prouve ni acteur capable, ni état sûr, ni restauration testée, ni attribution correcte des pertes.
