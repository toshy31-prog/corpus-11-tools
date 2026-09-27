# Traces et évaluations locales

`agent_trace.py` définit `corpus.agent-trace.v1`, une trace locale inspirée de la forme OTel/OpenInference : un run et des spans ordonnés `model`, `tool`, `retrieval`, `guardrail` ou `evaluation`. Elle n’importe aucun SDK, n’effectue aucun accès réseau, n’envoie rien et refuse les champs de contenu (`prompt`, `message`, `command`, `path`, etc.). Les identifiants de run sont hachés ; seuls les durées relatives, états et attributs courts non sensibles restent dans la sortie.

`scenario_evaluation.py` valide la banque `SCENARIOS.json` et peut associer une trace redigée à une soumission déjà produite. Il ne lance ni modèle, ni outil, ni commande. Une soumission est une preuve déclarée locale : elle ne transforme pas le statut source du scénario, et ne suffit pas à établir la qualité sémantique ou une autonomie générale.

Exemples hors ligne :

```bash
python3 scenario_evaluation.py SCENARIOS.json
python3 agent_trace.py .migration-smoke/durable-e2e-20260927.json --workflow-receipt
python3 -m unittest test_agent_trace.py test_scenario_evaluation.py
```

Le palier atteint est une **infrastructure de trace et d’évaluation locale**. La banque historique reste descriptive tant que les fixtures, juges et résultats ne sont pas gelés séparément.
