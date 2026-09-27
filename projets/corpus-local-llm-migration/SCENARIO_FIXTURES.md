# Banque de fixtures gelées

`SCENARIOS.json` contient les cas lisibles. `SCENARIO_FIXTURES.json` en fige
l’état avec une empreinte de la banque entière et une empreinte par cas. Les 24
fixtures sont toutes au statut `frozen_not_executed` : aucune réponse de modèle,
outil ou service n’a servi à les produire.

Toute modification du texte, des attentes ou des échecs d’un scénario invalide
le manifeste existant. Il faut alors le régénérer explicitement et conserver
l’ancienne version comme trace de la campagne précédente.

Une soumission attachée à une fixture porte un `declared_result` et peut annoncer
un reçu par empreinte. `scenario_evaluation.py` garde cependant
`verified_result: null` : il ne lance rien, n’authentifie aucun reçu et ne
transforme jamais le résultat déclaré en succès vérifié ou en promotion.

```bash
# vérifier la couverture et les empreintes
python3 scenario_evaluation.py SCENARIOS.json --fixtures SCENARIO_FIXTURES.json

# préparer une nouvelle version après changement assumé de la banque
python3 scenario_evaluation.py SCENARIOS.json --freeze-output SCENARIO_FIXTURES_NOUVEAU.json

# associer une déclaration sans l’élever en preuve vérifiée
python3 scenario_evaluation.py SCENARIOS.json --fixtures SCENARIO_FIXTURES.json \
  --fixture-submission SCENARIO_SUBMISSION_TEMPLATE.json
```

La prochaine étape est une vérification séparée, avec une grille de jugement et
des preuves d’exécution reproductibles. Elle nécessite une autorisation explicite
avant tout appel local au modèle.
