# Réutilisation ciblée : outils par tâche — 26 septembre 2026

## Choix appliqué

Réutiliser le masque explicite natif de Corpus/OpenCode, selon le principe function_list de Qwen-Agent : l’appelant nomme les capacités nécessaires à une tâche dont le périmètre est déjà connu. Aucun code tiers copié, aucune dépendance ajoutée. Le routeur V5.5 reste intact ; il respecte déjà ces masques. Les permissions d’exécution restent séparées et doivent être conservées dans la session.

`tool_scope.py message.json --tool read --tool edit --tool bash` prépare le message sur stdout, sans envoi, inférence ou modification de la source. L’utilitaire refuse les outils inconnus, l’écrasement d’un masque existant et l’activation d’outils pour corpus-plan. Ne pas appliquer ces trois outils à toutes les conversations : c’est le périmètre de cette épreuve précise. L’absence de glob ne limite pas les chemins que read peut lire ; ce masque n’est pas une sandbox ni une preuve d’absence de dérive.

Le message de l’épreuve existante est préparé à l’identique dans `.migration-smoke/scoped-workflow-message.json`, avec seulement read/edit/bash exposés. Aucun indice supplémentaire ni réponse attendue ajouté au prompt. Les descriptions compactes restent désactivées. Cette variante n’a pas été envoyée : lors d’un éventuel essai, réutiliser aussi les permissions bornées de la session précédente (édition de la seule copie, commande de test exacte). Le message préparé seul ne les accorde ni ne les configure.

## Mesure sans modèle

Sous-ensemble des définitions originales déjà capturées dans /tmp/corpus-v4-provider-payloads/07-all.json : dix outils → trois, 13752 → 8971 caractères de schémas, soit −34,77 %. Schémas et descriptions conservés à l’identique. Ce calcul hors ligne n’est ni une nouvelle capture du runtime, ni un compte de tokens, ni un gain de latence ou de qualité mesuré. Rapport : `.migration-smoke/tool-scope-cost.json`.

`python3 projets/corpus-local-llm-migration/test_tool_scope.py` : 3 tests réussis, dont le passage dans le vrai routeur Python avec appel de routage interdit par le test. Aucun redémarrage, aucune installation, zéro appel Qwen.

## Sources examinées et licences

- [Qwen-Agent, FnCallAgent](https://github.com/QwenLM/Qwen-Agent/blob/main/qwen_agent/agents/fncall_agent.py) : sélection explicite par function_list ; [Apache-2.0](https://github.com/QwenLM/Qwen-Agent/blob/main/LICENSE). Principe retenu via l’API native déjà présente ; remplacer le runtime entier ne se justifie pas pour ce besoin.
- [Goose, extensions](https://github.com/aaif-goose/goose/blob/main/documentation/docs/getting-started/using-extensions.md) : activation/désactivation et découverte des extensions ; [Apache-2.0](https://github.com/aaif-goose/goose/blob/main/LICENSE). À examiner pour des tâches au périmètre ouvert ; cette étape supplémentaire est inutile quand les outils sont connus.
- [codestz/mcpx](https://github.com/codestz/mcpx) : découverte et invocation MCP par CLI, recherche BM25 ; README annonçant MIT, fichier de licence non récupéré dans cette passe. Pas d’import tant que la licence exacte et les contrôles d’exécution ne sont pas vérifiés. Ajouter un accès shell aux MCP doit préserver les permissions existantes.
- [Anthropic, advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use) : découverte différée pour éviter la charge de tous les schémas. Source d’architecture consultée, pas une autorisation de copier du code sous licence non vérifiée ; aucun service cloud introduit.

Ce choix est une adaptation locale minimale, pas un classement exhaustif du secteur ni une preuve que ces projets résolvent toute la migration Corpus. Prochaine décision : n’exécuter la variante préparée que si vérifier sa réussite justifie son coût ; aucun nouveau benchmark de texte court nécessaire.
