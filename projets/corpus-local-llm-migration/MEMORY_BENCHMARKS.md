# Matrice de régression mémoire

`MEMORY_BENCHMARKS.json` lie quatre cas de frontières mémoire à des fixtures
agentiques gelées par empreinte. La matrice ne conserve que des identifiants et
empreintes synthétiques : aucun texte de note, archive, instruction ou document
sensible n’est inclus.

| Cas | Garantie vérifiée |
| --- | --- |
| M01 | Une archive importée reste en quarantaine. |
| M02 | Une revue ne fait que proposer une sélection manuelle pour le rappel. |
| M03 | Une revue avec empreinte périmée est refusée. |
| M04 | Une tentative de promotion au noyau est refusée. |

```bash
python3 memory_benchmark.py MEMORY_BENCHMARKS.json SCENARIO_FIXTURES.json
python3 -m unittest test_memory_benchmark.py
```

La matrice vérifie les frontières déterministes du contrat, jamais la véracité,
la pertinence ou la qualité sémantique d’une note. Toute dérive d’empreinte de
fixture bloque le cas concerné avant son évaluation.
