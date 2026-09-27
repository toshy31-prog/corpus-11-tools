# Qualité des outils et du contexte

`tool_context_quality.py` produit un rapport déterministe à partir du catalogue,
des profils, des scénarios et de `TOOL_SCENARIO_LINKS.json`. Il contrôle la
cohérence des noms, namespaces, descriptions et effets, regroupe les descriptions
identiques, mesure le volume de définitions par profil et rend explicites les
scénarios qui n’ont pas de profil couvrant toutes les capacités déclarées.

Le rapport actuel ne modifie rien. Les trois écarts signalés sont utiles à
qualifier, pas des régressions déjà corrigées : les scénarios C12 et C24 demandent
à la fois mémoire, fichiers et shell, tandis que C18 relie documents et médias ;
les profils proposés ne couvrent pas ces ensembles. Les descriptions dupliquées
sont également une demande de revue, sans supposer qu’elles doivent être fusionnées.

```bash
python3 tool_context_quality.py
python3 -m unittest test_tool_context_quality.py
```

Les budgets sont des caractères de descriptions et schémas statiques, jamais des
tokens ou une mesure de latence. La liaison à un scénario ne prouve ni la sélection
d’un outil, ni son autorisation, ni sa réussite. Toute correction ultérieure doit
préserver le contrat d’intégrité du catalogue et être vérifiée séparément.
