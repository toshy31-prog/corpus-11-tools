# Calibration dans un registre fictif daté

Compare trois règles de prévision sur vingt cas produits par une fonction qui ne
lit pas les probabilités rivales pendant l'exécution. Issues et rivaux restent
cependant co-conçus dans le même artefact : seule la séparation de code est
établie. Le score de Brier est décomposé en fiabilité, résolution et incertitude
sur le registre fermé.

Exécution : `python3 tests/test_fictional_forecast_registry.py`.
Portée `formal_exact` sur les vingt lignes déclarées.
