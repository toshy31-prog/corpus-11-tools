# Cas gelés de routage modèle

`MODEL_ROUTING_CASES.json` fixe sept demandes sans prompt : tâche simple ou
complexe, outils, image, budget de raisonnement, contexte dépassé et profil COLD
indisponible. Chaque cas est lié aux empreintes exactes du registre et des locks
de modèles ; toute dérive bloque l’évaluation.

```bash
python3 model_routing_cases.py MODEL_ROUTING_CASES.json
python3 -m unittest test_model_routing_cases.py
```

Les cas vérifient que `model_routing.decide` reste conservateur : un profil COLD
reste différé, une variante réflexion exige son budget explicite, et toute sortie
conserve `execution:not_started` et `runtime_change:none`.

`task_class` est une étiquette de benchmark. Le routeur existant ne prétend pas
inférer la complexité depuis une demande réelle ; ce serait une capacité distincte
à évaluer avant toute activation.
