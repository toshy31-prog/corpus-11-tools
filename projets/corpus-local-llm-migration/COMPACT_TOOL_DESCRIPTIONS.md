# Descriptions d’outils compactes — candidat local

Statut : testé sur payload réel puis activé pour une épreuve Qwen bornée, non admis et désactivé après retour arrière. La comparaison de payload ci-dessous ne sollicitait pas Qwen. Le routeur V5.5 est inchangé.

## Choix et garde-fous

Hook natif tool.definition, six outils : bash, read, edit, write, glob, grep. Seules leurs descriptions changent. Paramètres, noms, schémas, permissions et fonctions exécutées restent ceux d’OpenCode. Une empreinte SHA-256 exacte de chaque description source conditionne le remplacement ; toute description inconnue est conservée. Les descriptions sont adaptées de la documentation OpenCode sous MIT : notice conservée dans licenses/opencode-tool-descriptions-MIT.txt.

Le texte compact conserve les règles essentielles : lecture avant modification, remplacement unique/replaceAll, chemins et workdir, borne de sortie, absence d’autorisation Git implicite, hooks et secrets. La fidélité comportementale de Qwen reste à vérifier ; l’identité du schéma ne la prouve pas.

## Mesure réelle, sans modèle

Deux instances OpenCode temporaires dans le sandbox existant, chacune dirigée vers un faux provider local et supprimée à la fin. Même ensemble de dix outils que l’épreuve de migration. Six descriptions effectivement remplacées ; tous les noms et paramètres identiques.

- Définitions d’outils : 13 752 → 7 654 caractères (−44,34 %).
- Requête complète : 21 606 → 15 508 caractères (−28,22 %).

Ce ne sont ni des tokens exacts du prompt rendu, ni une mesure de vitesse, ni une preuve de réussite des tâches. Rapport : .migration-smoke/compact-provider-report.json.

## Recherche consultée le 26 septembre 2026

- OpenAI, Tool search : https://developers.openai.com/api/docs/guides/tools-tool-search — chargement différé et namespaces. Corpus dispose déjà du masquage dynamique ; pas d’import d’une dépendance cloud.
- Anthropic, Advanced tool use : https://www.anthropic.com/engineering/advanced-tool-use — découverte différée et orchestration ; conserver une base stable pour le cache.
- TSCG (mai 2026) : https://arxiv.org/abs/2605.04107 — compilation déterministe des schémas en représentation compacte. Piste intéressante mais changement de représentation non repris ici : conserver le contrat natif évite une nouvelle couche de décodage à qualifier.
- DocsChisel (août 2026) : https://arxiv.org/abs/2608.10037 — l’utilité des champs de documentation dépend du modèle, du domaine et du type d’agent. Conséquence retenue : ne pas confondre compression et qualité ; valider le travail réel de Qwen.

Les résultats publiés ne sont pas transposés en gains Corpus. Aucun code de ces projets de recherche copié.

## Validation effectuée

- node projets/corpus-local-llm-migration/test_compact_tool_descriptions.mjs : PASS (outils inconnus et définitions modifiées conservés, paramètres identiques). Également exécuté avec la capture locale antérieure : remplacements reconnus et vérifiés.
- python3 -m unittest discover -s projets/corpus-local-llm-migration -p test_tool_description_mode.py : 1 PASS.
- node projets/corpus-local-llm-migration/test_plan_guard.mjs : 15 PASS.
- .migration-smoke/capture_compact_tools.py via API shell locale : provider_capture_pass, zéro Qwen.
- git diff --check : PASS.

## Activation et retour arrière

Par défaut : off. Après autorisation, écrire compact-v1 dans CONFIG_ROOT/routing/tool-descriptions-mode, puis redémarrer corpus-local.service et vérifier un parcours réel lecture/modification/test. Sauvegarder d’abord le contenu antérieur du fichier de mode. Retour arrière : restaurer ce contenu (ou supprimer uniquement le nouveau fichier s’il était absent), puis redémarrer. Aucun changement des poids, du routeur V5.5 ni de la configuration GPU Qwen.

## Veille élargie : Chine, Russie et open source

Sources primaires consultées pour cette activation :

- Qwen (Alibaba), https://qwen.readthedocs.io/en/latest/framework/function_call.html : importance du format d’appel et du parseur adaptés au modèle. Le hook conserve le format natif existant.
- DeepSeek, https://api-docs.deepseek.com/guides/kv_cache/ : réutilisation des préfixes communs. Principe architectural étudié ; aucun service DeepSeek ajouté.
- Yandex AI Studio, https://aistudio.yandex.ru/en/docs/ai-studio/operations/generation/function-call : contrat description/paramètres puis résultat d’outil. Référence comparative russe, pas un moteur local ni une dépendance retenue.
- CacheRouter (août 2026), https://arxiv.org/abs/2608.22708 : tension entre sélection dynamique et stabilité du préfixe, avec séparation des chemins de routage et d’exécution. Piste de prochain travail si le changement de catalogue invalide trop de cache ; résultats distants et protocole des auteurs non assimilés à une validation Corpus.

La veille couvre les acteurs et implémentations pertinents mondialement, sans priorité de nationalité. Critères d’adoption : fonctionnement local, bénéfice mesuré sur cette machine, licences, maintenance, réversibilité et préservation de l’Organisme Corpus.

## Épreuve réelle du mode compact et retour arrière

Activation autorisée, puis une seule épreuve Qwen locale : lire la décision concernant les modèles distants, modifier uniquement une copie de runtime_limits.py et exécuter son test. Première entrée : 4225 tokens ; cache réutilisé aux étapes suivantes. Le modèle a effectué deux lectures, un glob et une lecture supplémentaire de DECISIONS.md. Il a affirmé ne pas avoir trouvé la décision pourtant présente dans CONTEXTE_LOCAL.md, lignes 17–18.

La borne configurée de vingt minutes a été atteinte (1219,51 s observées, routage et sondages inclus) sans modification ni exécution du test. Un appel edit était pending, sans arguments, à l’arrêt ; aucune édition exécutée n’est attestée. Copie et source restent identiques. L’épreuve est incomplète et non admise ; aucun gain de qualité ou de latence finale n’est démontré. Sans exécution comparable avec les descriptions originales, ce défaut ne peut pas être attribué causalement à leur compression.

Le réglage antérieur a été restauré et le service redémarré ; health.ready=true vérifié. Le correctif CPU du retrieval est conservé. Le candidat compact reste disponible, désactivé. Preuves : .migration-smoke/compact-e2e-result.json et compact-rollback.json. Les snapshots OpenCode peuvent inclure les modifications concurrentes de Codex : seuls les appels d’outils établissent les actions de Qwen.

Prochaine priorité : qualifier le suivi des consignes et la latence sur une tâche locale représentative avant toute promotion. Ce résultat ne valide pas l’ensemble de l’Organisme Corpus.
