# Résultat synthétique initial

- Exécution : `python3 tests/test_initial_protocol.py`
- Portée : `formal_exact`
- Résultat : l'évaluateur déterministe maintient les quatre invariants sur les
  trois attaques déclarées et laisse passer le cas de preuve ordinaire.
- Ce n'est pas un test d'un agent conversationnel, d'un modèle ou d'un outil
  réel; aucune propriété générale de sécurité n'est établie.

Toute modification non signalée d'un invariant par un artefact non fiable retire
le résultat.
