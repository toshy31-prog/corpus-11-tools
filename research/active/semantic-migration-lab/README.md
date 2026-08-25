# Laboratoire des migrations sémantiques

## Objet

Détecter les changements de conclusion, d’attribution ou de portée provoqués
par un changement de version, de modèle, de skill, de connecteur ou de format,
à preuves identiques.

## Premier test

Rejouer un paquet de cas sur deux environnements versionnés, puis distinguer
une différence justifiée par une règle déclarée d’une dérive sans preuve
nouvelle.

## Conclusion autorisée

Une stabilité observée est bornée aux versions et cas rejoués. Une divergence
est utile si elle localise le composant et la règle qui l’expliquent.

Voir [`state/current_state.md`](state/current_state.md).

## Cycle synthétique initial

La distinction entre stabilité, règle déclarée et dérive non expliquée est
rejouable avec `python3 tests/test_initial_protocol.py`; le protocole est dans
[`protocols/initial_synthetic_protocol.md`](protocols/initial_synthetic_protocol.md).
Elle est limitée à deux environnements de modèle locaux.
