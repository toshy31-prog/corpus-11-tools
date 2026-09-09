# Protocole v0.3 — sortie identique et marge synthétique

## Portée et gel

Ce protocole est fixé avant la première exécution de la v0.3. Il réutilise
`BASE_CHANNELS` et `execute` depuis `tests/test_functional_modal_tasks.py`, sans
les modifier.

La portée est `pipeline_verified`, `internal_synthetic_only`. La validité
externe est `not_claimed`, le pré-enregistrement démontré est absent et
l'indépendance reste `independence_unknown`.

Liste fermée v0.3 :

1. `protocols/2026-09-09-output-equivalence-remainder-v0.3.md` ;
2. `fixtures/output_equivalence_remainder_v0.3.json` ;
3. `tests/test_output_equivalence_remainder.py` ;
4. `reports/synthetic/2026-09-09-output-equivalence-remainder-v0.3.md` ;
5. `state/current_state.md`.

Seuls les trois premiers fichiers sont autorisés avant la première exécution.

## Configuration fixe et variation unique

Le point de départ est exactement la variante vocale assistée déjà présente :

```python
dict(BASE_CHANNELS["voice"], evidence_loss=False, load=4)
```

Le seul champ varié entre les configurations est `load_threshold`, sur
`{3, 4, 5}`. La marge synthétique est calculée par
`load_threshold - load` ; elle n'est pas interprétée hors de l'exécuteur.

Prédictions gelées :

- seuil `3` : échec exact `load_threshold_exceeded`, marge `-1` ;
- seuil `4` : succès à la frontière, marge `0` ;
- seuil `5` : succès, marge `1` ;
- les sorties terminales complètes aux seuils `4` et `5` sont strictement
  identiques.

Une perturbation commune de `-1` est ensuite appliquée aux deux configurations
initialement réussies : `4 → 3` doit échouer exactement pour
`load_threshold_exceeded`, tandis que `5 → 4` doit réussir.

Le test doit prouver computationnellement que chaque paire de configurations
du balayage, ainsi que chaque état avant/après perturbation, ne diffère que par
`load_threshold`.

## Rivaux

`final_output_only_equivalence` prédit que les états aux seuils `4` et `5` sont
équivalents parce que leurs sorties terminales initiales sont identiques. Il
perd uniquement si ces deux états réussissent initialement et si la même
perturbation `-1` produit ensuite deux verdicts différents.

`material_equivalence` prédit que les deux états ne sont pas équivalents dans
ce contraste, car leurs marges synthétiques diffèrent et la perturbation
commune doit les séparer.

La seule classification admise est
`common_perturbation_separates_equal_outputs`, avec
`final_output_only_equivalence` comme rival perdant. Toute autre issue devient
`candidate_set_incomplete` et fait échouer le test.

## Critères d'arrêt

Arrêter sans réparation si le test historique échoue, si l'exécuteur existant
doit être modifié, si un autre champ que `load_threshold` varie, si les sorties
aux seuils `4` et `5` diffèrent, si la frontière exacte n'est pas observée, ou
si la classification est `candidate_set_incomplete`.

L'ordre des clés de dictionnaire n'est pas traité comme un ordre temporel. Le
résultat ne porte que sur une marge numérique synthétique et sur les branches
de l'exécuteur existant.
