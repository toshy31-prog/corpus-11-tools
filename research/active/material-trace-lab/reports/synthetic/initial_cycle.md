# Résultat synthétique initial

- Exécution : `python3 tests/test_initial_protocol.py`
- Portée : `model_internal`
- Résultat : les trois scénarios déclarés passent exactement leurs oracles.
- Différence observée dans le modèle : après partition, une réplique obsolète
  réactive deux tombstones sous `payload_wins`; la propagation de tombstone
  déclarée empêche cette réactivation.
- Ce résultat ne mesure pas un banc matériel, une base de données réelle, une
  latence, un cache, ni une propriété générale de suppression.

La conclusion est à retirer si la fixture, les invariants ou le simulateur ne
restent plus cohérents entre eux.
