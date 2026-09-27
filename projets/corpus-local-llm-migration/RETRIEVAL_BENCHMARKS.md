# Cas gelés de ranking retrieval

`RETRIEVAL_BENCHMARKS.json` fixe cinq cas synthétiques et adversariaux pour le
contrat de ranking : résultat pertinent, résultat interdit, absence de résultat,
doublon dans le classement et chevauchement ambigu entre attendu/interdit. Il est
lié par empreinte au code de `retrieval_evaluation.py` : une modification de
l’évaluateur bloque la suite jusqu’à revue explicite.

```bash
python3 retrieval_benchmark.py RETRIEVAL_BENCHMARKS.json
python3 -m unittest test_retrieval_benchmark.py
```

La suite ne stocke ni requête utilisateur ni contenu documentaire. Elle ne lance
pas l’index, l’embedder, le reranker ou un modèle. Elle qualifie le comportement
de l’évaluateur sur des identifiants classés, jamais la pertinence réelle du
retrieval Corpus.
