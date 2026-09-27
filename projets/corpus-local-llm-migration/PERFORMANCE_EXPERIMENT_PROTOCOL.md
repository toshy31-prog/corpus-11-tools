# Protocole d’expériences de latence Qwen

Ce protocole prépare les essais à venir. Il ne lance ni modèle, ni service, ni
redémarrage et ne change aucune configuration. Son objectif est d’éviter une
optimisation qui rendrait Corpus moins fiable ou confondrait plusieurs causes.

Le point de départ observé est l’épreuve agentique durable du 27 septembre :
332,187 s de transcript, dont 0,174 s attribués aux outils. Le premier levier à
isoler est donc le calcul du modèle. Voir `PERFORMANCE_E2E.md` pour la mesure et
ses limites.

## Invariants obligatoires

Chaque paire A/B reprend le même exercice `migration-smoke-v1` et doit fournir :

- même moteur, version, modèle, quantification et hachage du modèle ;
- même contexte (`16384`), prompt, profil d’outils et fixture, chacun haché ;
- même GPU, réglage de fusion CUDA et même état de charge observé ;
- même délai maximal et une seule requête soumise par épreuve ;
- reçu durable terminé, chaîne `read → edit → test` vérifiée par
  `workflow_verifier.py`, service `ready` après l’épreuve et aucune erreur CUDA.

Un succès fonctionnel n’évalue que cette chaîne étroite. Il ne transforme pas
l’essai en preuve de qualité générale, d’autonomie générale ou de sûreté
sémantique.

## Ordre des essais

1. **Budget de raisonnement** : `--reasoning-budget 512` (référence) contre
   `0` (candidat). Aucun autre paramètre ne bouge. Le profil direct désactive
   déjà le thinking dans le template ; le résultat fonctionnel doit donc rester
   démontré, jamais supposé.
2. **CPU-MoE**, seulement si le premier essai est propre : comparer le profil
   courant `--cpu-moe` à une valeur explicite de `--n-cpu-moe N`, un seul `N`
   par paire. Ne jamais changer `-ngl`, les lots, le contexte ou la quantification
   dans cette même paire.
3. **Préfixe/KV** : après observation de préfixes identiques dans de vraies
   requêtes, tester `--cache-reuse` séparément. Le cache doit être indexé par
   modèle, configuration, permissions et profil d’outils.

Les lots, la fusion CUDA, la quantification, le moteur et l’architecture de
serving sont hors de ces essais. La fusion CUDA reste inchangée : un plantage
antérieur interdit de la traiter comme un simple levier de vitesse.

## Décision et retour arrière

Le validateur local `performance_experiment.py` lit deux reçus déjà collectés.
Il demande une amélioration d’au moins 10 % du temps mural, sans perte de chaîne
fonctionnelle ni incident CUDA. Ses trois sorties sont :

- `eligible_for_human_review` : candidat mesuré plus vite et fonctionnel ; ce
  n’est pas une activation ;
- `inconclusive` : fonctionnement correct mais gain inférieur au seuil ; garder
  le profil courant ;
- `rollback_recommended` : erreur CUDA, service non prêt, chaîne fonctionnelle
  échouée ou plus d’une variable modifiée ; revenir au profil de référence et
  conserver les reçus.

Avant toute activation, relire les traces et demander la décision humaine. Une
activation, si autorisée, doit pouvoir rétablir exactement le profil précédent.

## Manifest minimal à remplir après les deux épreuves

```json
{
  "experiment": "reasoning-budget",
  "variation": {"key": "reasoning_budget", "baseline": 512, "candidate": 0},
  "baseline": {
    "configuration": {"reasoning_budget": 512, "n_gpu_layers": 99, "cpu_moe": "all"},
    "environment": {"engine": "…", "engine_version": "…", "model": "…", "model_sha256": "…", "quantization": "…", "context_tokens": 16384, "prompt_sha256": "…", "tool_profile_sha256": "…", "fixture_sha256": "…"},
    "timing": {"wall_seconds_from_transcript": 332.187},
    "verification": {"execution_chain_verified": true},
    "runtime": {"terminal": "completed", "service_health_after": "ready", "cuda_errors": []}
  },
  "candidate": {"…": "mêmes champs, seule la valeur testée change"}
}
```

Exécution strictement hors inférence :

```bash
python3 performance_experiment.py manifest.json --output verdict.json
python3 -m unittest test_performance_experiment
```
