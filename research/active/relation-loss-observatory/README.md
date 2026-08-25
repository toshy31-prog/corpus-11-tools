# Observatoire fictif des pertes relationnelles

## Objet

Tester dans des graphes déclarés quand des objets inchangés perdent accès ou
réutilisabilité à cause d’une relation retirée. L’unité d’analyse est
« objet + chemin relationnel », sans collecte ni cas externe.

Le contrôle initial vérifie seulement une porte de refus (`pipeline_verified`).
Le protocole apparié suivant compare deux migrations fictives : perte d’index
et perte de contexte. Besoin, permission, coût et compétence restent constants,
puis l’arête retirée est restaurée comme contrôle de réactivation.

Exécution : `python3 tests/test_fictional_paired_migrations.py`.
Conclusion : `model_internal` sur les deux graphes déclarés.

Voir [`state/current_state.md`](state/current_state.md).
