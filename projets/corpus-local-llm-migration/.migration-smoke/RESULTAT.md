# Épreuve de migration — 26 septembre 2026

Statut : BLOQUÉE, non réussie.

But : lire une décision du contexte Corpus, modifier uniquement une copie de runtime_limits.py, puis lancer test_budget.py.

Le service répond ready=true. La session ses_f20826d53ffeXj3Ki4jMrZzG9g reçoit un masque incluant lecture, édition et shell. Le moteur Qwen échoue au démarrage avec « upstream command exited prematurely » ; quatre tentatives sont observées avant arrêt explicite de cette seule session. Aucun appel d’outil ni modification de la copie observé.

Le test local préalable échoue comme attendu : fits_context absent. Le parcours de migration n’est donc pas validé. L’erreur du runtime est établie ; sa cause précise (ressources, configuration ou autre) reste inconnue. Accès au journal interne llama-swap refusé par nsenter. Aucun redémarrage, aucun changement de configuration ni du fichier original.

Point secondaire : le masque expose également SSH et les outils d’écriture mémoire, inutiles à cette tâche. Aucun de ces outils n’a été exécuté.

Trace détaillée de la session : /tmp/corpus-migration-smoke-report.json (temporaire).

Prochaine action : obtenir le stderr de démarrage de Qwen avant toute correction du runtime.

## Diagnostic et correctif préparé

Le journal interne de Qwen a été lu via la commande shell native d’OpenCode, sans inférence. Erreur : allocation de 5861.76 MiB CUDA refusée (out of memory).

Une sonde bornée a confirmé que les modèles retrieval configurés -ngl 0 occupent respectivement 2642 MiB et 3026 MiB GPU. La documentation locale llama.cpp précise que -ngl 0 peut encore déporter des opérations ; --device none désactive cet usage.

Correctif source : --device none ajouté aux deux commandes retrieval dans corpus_local.py. Configuration Qwen et groupe V9 conservés.

Validation : python3 -m unittest discover -s projets/corpus-local-llm-migration -p test_retrieval_cpu_config.py : 1 test réussi. Deux processus temporaires utilisant --device none ont répondu HTTP 200 aux appels embeddings et rerank ; aucun des deux PID ne figurait parmi les processus GPU. Les deux processus ont été arrêtés après vérification. CPU_RETRIEVAL_LIVE_PASS.

Statut : correction écrite et testée en isolation, NON ACTIVÉE. Le service existant conserve son ancienne configuration jusqu’au redémarrage autorisé. La reprise de Qwen et le parcours complet restent à vérifier après activation.

## Activation autorisée et vérifiée

Redémarrage explicitement autorisé par Olivier et exécuté. Configuration effective : --device none pour embedding et reranker. Appels embeddings et rerank HTTP 200 après redémarrage, aucun processus GPU listé à cette étape. Une réponse Qwen réelle CPU_OK reçue ensuite ; fin observée à 160,38 s (polling toutes les 5 s). Aucun nouvel échec de démarrage dans cet essai. Correctif activé et vérifié sur ce scénario ; le parcours modification + test initial reste non validé. Voir activation-validation.json.
