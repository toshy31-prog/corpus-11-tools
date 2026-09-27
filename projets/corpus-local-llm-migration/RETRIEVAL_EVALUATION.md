# Évaluation locale du retrieval

`retrieval_evaluation.py` vérifie un résultat déjà enregistré, sans démarrer la
recherche hybride, l’embedder, le reranker ou un modèle conversationnel. Les cas
contiennent seulement des identifiants : résultats attendus, résultats interdits
et ordre de résultat observé. Le texte des documents, la requête et l’index ne
sont pas nécessaires à cette évaluation.

Les mesures sont : rappel moyen à `k`, part des cas ayant au moins un résultat
attendu, premier rang pertinent et nombre de résultats interdits. Les seuils sont
partie intégrante du manifeste : un échec reste un échec, même si une mesure
partielle est bonne.

Le modèle est disponible dans **Paramètres → Reprise de projet → Qualité du
retrieval**. Il accepte un manifeste JSON collé, rend les résultats consultables,
et ne modifie rien. Le fichier [RETRIEVAL_EVALUATION_TEMPLATE.json](RETRIEVAL_EVALUATION_TEMPLATE.json)
sert de format de départ.

Exécution hors ligne :

```bash
python3 retrieval_evaluation.py RETRIEVAL_EVALUATION_TEMPLATE.json
python3 -m unittest test_retrieval_evaluation.py
```

Limites : la pertinence attendue doit être constituée et revue par une personne ;
l’outil ne prouve ni que les cas représentent tous les usages, ni la latence, ni
la qualité de l’index ou des modèles de retrieval. Une campagne mesurée devra
être lancée séparément, seulement lorsque les appels locaux seront autorisés.

## Régressions gelées

La suite [RETRIEVAL_BENCHMARKS.md](RETRIEVAL_BENCHMARKS.md) verrouille les cas de
classement ambigus ou adversariaux avant toute campagne avec index réel.
