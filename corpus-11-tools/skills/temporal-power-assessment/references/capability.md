# CAP.TEMPORAL_POWER_ASSESSMENT — provenance opérationnelle

> Statut : capacité récupérée candidate, non établie par sa seule inscription.

## Définition runtime

- statut: recovered_candidate_unvalidated
- classe: recovered_distinct
- sources: Sur-modèle 9.2 et module 03, blocs `rate_limit`, `decision_time`, `rhythm_power`

## Relations

- `CAP.TEMPORAL_POWER_ASSESSMENT --uses[critical]--> CAP.HIDDEN_COST_ASSESSMENT`
- `CAP.TEMPORAL_POWER_ASSESSMENT --uses[contextual]--> CAP.FIELD_CAPACITY_ASSESSMENT`

## Reste discriminant

Un délai identique peut distribuer des pertes inégales; une pause peut être nominale; la vitesse peut supprimer traces et recours.
