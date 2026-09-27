# Registre d’adoption SOTA — Corpus local

Ce registre distingue une idée examinée, une adaptation locale, une capacité
vérifiée et une hypothèse. Une source ne confère ni autorisation d’exécution,
ni preuve de gain sur le matériel Corpus.

| Voie | Source et statut de licence | Principe retenu | Adaptation Corpus | État | Prochaine preuve nécessaire |
|---|---|---|---|---|---|
| Parallélisme agentique | Google Research, publication et billet 2026 | Le parallèle dépend de la décomposabilité et du coût de coordination | `orchestration_plan.py`, `delegation_admission.py` : dépendances, ressources exclusives, budgets | écrit et testé | tâches réelles comparées à séquentiel, sans mélanger les objectifs |
| Mémoire | Google ReasoningBank ; Letta Apache-2.0 (idées, pas de copie) | Mémoire compacte et expériences distinguées des archives | contrat core/recall/archive/procedural et diagnostic proposal-only | écrit et testé | banque de cas Retrieval représentative, gelée et mesurée |
| Outils / sécurité | Anthropic, MCP, catalogue Corpus | Peu d’outils ciblés, descriptions vérifiables, politique explicite | contrat de catalogue fail-closed, reçus de politique | écrit et testé | exécution réelle de scénarios adverses inoffensifs |
| Traces / évaluation | OpenInference, TRACE preview, Phoenix Apache-2.0 | traces hiérarchiques, données minimisées, graders séparés | `agent_trace.py`, `scenario_evaluation.py` | écrit et testé | scénarios matérialisés puis essais groupés |
| Cache / efficacité | llama.cpp, vLLM, SGLang Apache-2.0, travaux prompt-cache | Préfixe stable ; suffixe dynamique ; cache jamais confondu avec autorisation | enveloppe, télémétrie agrégée, admission A/B | écrit et testé | admission satisfaite puis une seule comparaison contrôlée |
| Interaction | pratiques UI agents et accessibilité Web | intention, autorisation, annulation et preuve lisibles | Repères du fil, annulation explicite, navigation clavier | écrit et testé | observation manuelle dans le portail en conditions réelles |

## Règle de réutilisation de code

Avant toute copie externe : identifier le fichier précis, sa licence et ses
notices, vérifier la compatibilité avec Corpus, conserver les attributions et
ajouter un test qui couvre l’adaptation. Les discussions GitHub, publications
et captures d’écran fournissent des idées ; elles ne sont pas du code copiable.

## Rejets actuels

- migration de runtime vers vLLM/SGLang : disproportionnée pour la RTX 4070 8
  Go et non justifiée par une mesure locale ;
- cache persistant SSD ou expérimental MoE : peut aggraver la latence et la
  pression mémoire ;
- GraphRAG ou nouvelle base vectorielle : aucun échec de retrieval n’établit
  encore ce besoin ;
- auto-maintenance exécutante : la proposition, la validation et le rollback
  doivent précéder toute autonomie d’écriture.
