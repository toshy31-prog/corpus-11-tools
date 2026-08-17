# CAP.FUNCTIONAL_DECOUPLING_ASSESSMENT — provenance opérationnelle

> Statut : capacité récupérée candidate, non établie par sa seule inscription.

## Définition runtime

- statut: recovered_candidate_unvalidated
- classe: recovered_composite
- source primaire: `archives/legacy/Atlas_3_0_final.zip`, bloc `patchbay`

## Relations

- `CAP.FUNCTIONAL_DECOUPLING_ASSESSMENT --requires[critical]--> CAP.FIELD_CAPACITY_ASSESSMENT`
- `CAP.FUNCTIONAL_DECOUPLING_ASSESSMENT --uses[critical]--> CAP.TERMINAL_RECOVERY_ASSESSMENT`

## Reste discriminant

Observation, mémoire, recommandation, commande, exécution, réplication et effacement doivent pouvoir être décidés séparément quand leur couplage n'est pas établi.
