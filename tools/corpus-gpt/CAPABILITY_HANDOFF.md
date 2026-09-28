# Capability handoff

États : source sur disque → source validée → reload demandé → source chargée confirmée. Observer un digest ne le promeut jamais.

Un checkpoint/handoff est d'abord un point de reprise persistant, pas une demande de nouvelle conversation. Les blocs restent bornés (environ 10–15 minutes ou frontière technique naturelle), puis la conversation courante continue automatiquement tant que le stream/contexte, la surface MCP et le runtime restent compatibles.

Le receipt v2 conserve directement : identifiant et HEAD, état Git intentionnel, fichiers modifiés et digests, validations et baselines acquises à ne pas répéter, capacités attendues/observées, noms exacts des jobs utiles, tokens async encore pertinents, invariants, travail en cours, prochaine action exécutable, blocages et critères d'arrêt.

## Frontières client distinctes

Le protocole distingue quatre décisions :

1. reload_required : la source chargée n'atteste pas encore le digest courant.
2. plugin_refresh_required : la surface/schema d'outils attendue diffère de celle observée et le client doit la redécouvrir.
3. new_chat_required : une raison technique concrète empêche la continuation fiable dans la conversation actuelle.
4. same_chat_continuation_allowed : aucune raison technique de changer de conversation n'est présente.

new_chat_required n'est donc jamais la conséquence automatique d'un checkpoint. Il devient vrai pour une raison explicite (new_chat_reason) : changement de surface/schema nécessitant renégociation, contexte/stream dégradé, incompatibilité runtime ou autre frontière technique justifiée. Un simple bloc borné avec surface stable continue dans la même conversation.

## Provenance des capacités observées

expected_capabilities décrit les capacités attendues après un changement de surface. observed_capabilities décrit les capacités réellement visibles depuis la surface du client ou de la conversation qui crée le handoff.

observed_capabilities est donc une observation déclarée par le client/caller ; Corpus backend ne la calcule pas à partir de son propre registre de tools et ne peut pas en déduire seul le schema effectivement chargé dans une conversation ChatGPT.

Un drift de source sans changement de schema n'impose pas automatiquement de nouvelle conversation. Lorsqu'un schema de tools change réellement, la surface cliente doit être rafraîchie si nécessaire puis réobserver les tools disponibles avant la reprise. Un resume_handoff réussi atteste la compatibilité de reprise qu'il vérifie ; il ne constitue pas, à lui seul, une preuve de fraîcheur du schema conversationnel.

## Reprise sans redécouverte

resume_handoff vérifie HEAD + working tree puis rend le receipt complet. Le consommateur utilise d'abord next_action, exact_jobs, async_tokens, baselines, blockers et stop_conditions ; il ne reliste ni ne rediagnostique les éléments déjà transportés sauf divergence ou régression fraîche.

Un runtime à jour ne prouve pas que le plugin a redécouvert une surface modifiée. Inversement, une surface stable et un contexte sain n'imposent ni refresh ni nouvelle conversation.

Principe : friction observée → classification → récurrence/utilité → primitive candidate → implémentation bornée → test minimal → receipt d'efficacité → promotion, limitation ou retrait. Garder le fast path simple.
