# CAP.TRANSPORTABILITY_ASSESSMENT — provenance opérationnelle

> Statut du nœud : candidat de conception non validé, distinct de la robustesse à des variations locales de protocole.

## Définition runtime

- statut: design_candidate_unvalidated
- classe: new_external_validity_boundary
- source de conception: besoin de passage des jouets, simulations et protocoles vers d'autres domaines

## Relations pertinentes du graphe 11.x

- `CAP.TRANSPORTABILITY_ASSESSMENT --requires[critical]--> CAP.PROTOCOL_ROBUSTNESS`
- `CAP.TRANSPORTABILITY_ASSESSMENT --uses[critical]--> CAP.FIELD_CAPACITY_ASSESSMENT`
- `CAP.TRANSPORTABILITY_ASSESSMENT --uses[contextual]--> CAP.CAUSAL_IDENTIFICATION`

## Schéma minimal

Compiler deux profils appariés : `population`, `units`, `mechanism`, `intervention`, `outcome`, `measurement`, `selection`, `environment`, `timing`, `support`, `interference`, `available_data`.

Ajouter : `differences`, `invariance_claims`, `bridge_evidence`, `target_observations`, `failure_modes`, `reversal_condition`.

## Procédure candidate

1. Établir séparément ce qui est supporté dans la source et dans la cible.
2. Marquer toute différence structurelle, de champ, de mesure ou d'intervention.
3. Pour chaque différence, fournir une preuve de pont, une hypothèse explicite ou un blocage.
4. Tester le recouvrement des situations et l'absence de cas cibles sans analogue source.
5. Rechercher une réobservation minimale dans la cible.

## Règles de verdict

- `robuste_dans_source != transporté_vers_cible`
- `même_nom_de_variable != même_mesure`
- `mécanisme_supposé_invariant_sans_test -> conditionally_transportable_at_best`
- `support_cible_hors_support_source -> transport_not_established`
- une simulation n'établit le monde matériel qu'avec canal, mesure et pont indépendants
