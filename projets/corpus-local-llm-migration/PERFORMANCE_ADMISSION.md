# Admission d’une expérience de cache

`performance_admission.py` décide si les observations agrégées disponibles
justifient de **préparer une unique comparaison A/B**. Il est complémentaire de
`performance_experiment.py` : l’admission vient avant une mesure, tandis que
l’autre module évalue deux mesures déjà réalisées.

Les conditions minimales sont configurables : suffisamment de continuations de
conversation, de candidats de préfixe stable, et de mesures de durée dans les
deux groupes « lecture de cache déclarée » et « non déclarée ». Toute insuffisance
donne `defer_qwen_experiment` et nomme les observations manquantes. Une admission
ne démarre ni Qwen ni llama.cpp, ne modifie aucune configuration et n’autorise pas
une promotion du runtime.

Le manifeste fixe aussi la seule variation envisagée et les invariants à relever :
moteur, modèle, quantification, contexte, prompt, outils et fixture. Une fois les
deux épreuves réellement observées, `performance_experiment.py` reste requis pour
vérifier que l’écart ne vient pas d’un changement de configuration ou d’un échec
fonctionnel/CUDA.

```bash
python3 performance_admission.py PERFORMANCE_ADMISSION_TEMPLATE.json
python3 -m unittest test_performance_admission.py
```

Les chiffres de cache restent des signaux, pas une preuve causale : un candidat de
préfixe peut manquer côté moteur et des tâches différentes ont des durées
différentes.
