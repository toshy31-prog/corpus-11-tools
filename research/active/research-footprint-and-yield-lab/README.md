# Empreinte et rendement de journaux fictifs

Compte séparément jetons, minutes, appels, changements de décision, sorties
uniques et porteurs de charge dans des journaux générés. Aucun score global ne
fusionne ces unités.

`python3 tests/test_generated_decision_logs.py` conserve un événement à rendement
nul et compare deux protocoles à `question_id`, états et sorties exactement
appariés. Des mutations de question et de sortie doivent échouer avant la
comparaison des coûts. Portée `pipeline_verified`.
