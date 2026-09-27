# Graders multi-axes des scénarios agentiques

`scenario_graders.py` lit une **exécution déjà enregistrée** reliée à une fixture
figée. Il applique quatre contrôles déterministes :

- outils : les namespaces requis par le scénario sont exposés ;
- politique : routeur en mode enforce, aucun namespace interdit exposé, aucun
  outil inconnu et aucune permission d’exécution inventée ;
- outcome : un état de fin rapporté est cohérent avec la trace rouge ; une
  réussite déclarée exige aussi une fin `completed` et aucune span non normale ;
- latence/budget : une durée rapportée respecte le plafond défini pour le cas.

Le grader ne lit ni requête ni argument d’outil. Il ne lance ni Qwen, ni outil,
ni service. Il n’authentifie pas un reçu : une réussite déclarée, même si les
quatre axes structurels passent, garde `verified_result: null` et
`promotion: not_performed`.

```bash
python3 scenario_graders.py SCENARIOS.json SCENARIO_FIXTURES.json soumission.json
python3 -m unittest test_scenario_graders.py
```

Les prochaines couches nécessaires restent une grille de jugement sémantique et
une vérification indépendante des effets sur le système. Elles ne sont pas
simulées ici.
