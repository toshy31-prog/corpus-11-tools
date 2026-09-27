# Preuves et fixtures de migration locale

Dossier de validation locale, pas un composant du runtime. Ne pas publier automatiquement : certains rapports contiennent des extraits du contexte local. Les états ci-dessous restent distincts.

## Preuves principales

- activation-validation.json : correctif retrieval CPU et réponse Qwen bornée.
- establishment-checks.json / coverage-after.json : contrôles d’implantation, avant puis après déclaration des sauvegardes.
- compact-provider-report.json : comparaison de requêtes sans modèle.
- compact-activation.json / compact-rollback.json : activation expérimentale et retour au réglage précédent.
- compact-e2e-result.json / compact-execution-verdict.json : tâche incomplète, pas une réussite.
- comprehension-short.json / comprehension-full.json : compréhension isolée, limites de format ; pas une validation agentique.
- tool-scope-cost.json : réduction calculée hors ligne des schémas d’outils.
- bounded-e2e-latest.json / bounded-e2e-verdict.json : épreuve du 27 septembre ; le serveur Qwen a terminé une requête de 202,08 s, mais aucun reçu OpenCode exploitable ni appel d’outil n’a été conservé. Copie inchangée.
- durable-e2e-20260927.json / durable-e2e-verdict.json : épreuve durable du 27 septembre réussie ; deux lectures, une édition de la copie seulement et le test exact réussi, tous reçus vérifiés. Durée totale : 334,172 s. Ce résultat ne généralise pas la fiabilité ni la vitesse.

`../durable_e2e.py` et `../launch_durable_e2e.py` ont servi à cette épreuve :
le second détache le premier dans le gestionnaire de services local, avant
l’unique envoi. Le premier inscrit le reçu atomiquement après chaque étape,
ne renvoie jamais un message ambigu et garde le transcript à analyser avec
`workflow_verifier.py`. Une première unité s’est arrêtée avant toute session à
cause de chemins relatifs ; la correction en chemins absolus a précédé le seul
envoi effectif. L’accusé HTTP 204 de `prompt_async` est désormais reconnu comme
acceptation, sans incidence sur l’épreuve déjà reçue.

Après une épreuve réellement terminée, `workflow_verifier.py --durable-result
RECU.json` lit seulement le rapport normalisé et l’état actuel de la copie : il
ne relance ni modèle, ni outil, ni test.

## Message d’épreuve

scoped-workflow-message.json : message OpenCode avec trois outils exposés. Il ne contient pas les permissions de session. Exécuté le 27 septembre : deux lectures, puis plantage CUDA ; aucun succès. Voir scoped-e2e-result.json, scoped-execution-verdict.json et scoped-cuda-crash.log. scoped-files-unchanged.json vérifie les empreintes des fichiers concernés.

## Fixtures et historique

runtime_limits.py est une copie d’essai ; test_budget.py teste cette copie, jamais la source du runtime. Les scripts de capture et de contrôle présents ici sont des bancs spécialisés, pas des services. RESULTAT.md, end-to-end-result.json et les autres rapports conservent les étapes antérieures ; voir ../ETAT_LOCAL_ACTUEL.md pour la synthèse actuelle. Aucun fichier de preuve supprimé par simple ancienneté.

## Épreuves V2/V3 : état exact

- `durable-e2e-v2-result.json` : chaîne `read → read → read → edit → bash`
  déclarée terminée ; durée de tour rapportée **511,406 s**.
- `durable-e2e-v3-result.json` et `durable-e2e-v3-verdict.json` : chaîne
  `read → read → edit → bash` déclarée terminée ; huit contrôles de reçu vrais,
  commande exacte terminée avec `MIGRATION_SMOKE_V2_PASS`, durée rapportée
  **121,688 s**.
- `durable-e2e-v2-v3-comparison.json` : différence observée de durée, mais
  `insufficient_for_attribution` car les séquences d'outils diffèrent. Cette
  sortie ne justifie aucun réglage de cache, runtime ou modèle.

Ces fichiers prouvent des états d'outils rapportés sur une fixture isolée ; ils
ne valident ni la migration complète, ni l'autonomie générale, ni une qualité de
réponse indépendante. Le lot représentatif est seulement préparé dans
`../REPRESENTATIVE_BATCH_SCHEDULE.json` : état `not_started`.
