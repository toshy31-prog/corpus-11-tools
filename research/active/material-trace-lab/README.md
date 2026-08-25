# Laboratoire des traces logiques distribuées

## Objet

Comparer, dans des systèmes fictifs déclarés, accessibilité logique,
tombstones, réplication et réactivation. Le champ
`payload_present_nodes` désigne uniquement un état logique du modèle : il ne
mesure aucune présence physique.

## Résultats disponibles

- `python3 tests/test_initial_protocol.py` vérifie trois séquences déclarées ;
  portée `model_internal`.
- `python3 tests/test_order_confluence.py` énumère exactement 324 exécutions.
  Douze couples état–source–politique changent avec l’ordre des cibles sous
  `tombstone_wins` ; portée `formal_exact` sur cet espace fini.

Le deuxième résultat affaiblit toute lecture générale selon laquelle le nom de
politique suffirait à prédire l’effacement logique. La boucle séquentielle et
son ordre sont une partie du mécanisme.

## Frontière et arrêt

Les nœuds, charges, suppressions et journaux sont fictifs. Le dossier s’arrête
sur une propriété seulement lorsqu’un rival apparié peut perdre dans le même
espace d’états et que la conclusion reste bornée au code déclaré.

Voir [`state/current_state.md`](state/current_state.md).
