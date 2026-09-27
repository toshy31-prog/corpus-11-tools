# Arrêt des reprises anormales

27 septembre 2026 — garde configurée dans le service ; validation sans inférence.

L’épreuve « Validation migration — trois outils natifs » a lu deux fichiers,
puis rencontré une erreur CUDA et poursuivi sans terminer la tâche. Rejouer une
étape peut coûter plusieurs minutes et répéter des outils déjà exécutés.

## Fonctionnement

`inference_guard.mjs` utilise le hook `chat.params` d’OpenCode 1.18.32, avant
l’appel au fournisseur. Pour `corpus-local` et les agents `corpus`,
`corpus-worker`, `corpus-plan`, il lit au plus 100 messages :

- le tour utilisateur et une seule étape active doivent être identifiables ;
- une erreur, une fin `unknown`/`other`/`error` ou une étape terminée sans motif
  dans ce tour bloque la prochaine requête ;
- une étape active ayant déjà une trace de démarrage, texte, raisonnement ou
  outil ne peut pas être rejouée ;
- une suite normale après `tool-calls` et une nouvelle consigne utilisateur
  restent possibles. Les erreurs des anciens tours ne bloquent pas le nouveau.

Le refus porte le préfixe `CORPUS_STEP_STOP`. Il ne réécrit aucun message et ne
dépend pas d’un compteur volatil. Une lecture d’historique impossible bloque
la requête.

Le site conserve les messages suivants et met leur file en pause après un échec
du dernier tour. « Orienter » ne contourne pas cette pause. « Reprendre la file »
ou envoyer explicitement une nouvelle consigne permet de continuer après examen
du fil. Les brouillons restent attachés à leur conversation.

## Limites

Ce mécanisme ne corrige ni CUDA ni le coût du prefill et ne valide pas le travail
effectué. Aucun gain de latence mesuré. La pause de la file appartient au site ;
la garde des requêtes appartient au moteur, sans dépendre d’un onglet ouvert.

Avant toute trace d’étape, les erreurs conservent la politique native de nouvelle
tentative : cinq retries maximum dans les sources installées. Les agents
techniques de titre/compaction et les autres fournisseurs sont hors périmètre.
Un tour sortant de la fenêtre de 100 messages est refusé. Une lecture locale
bornée s’ajoute à chaque étape ; son coût réel n’est pas mesuré.

## Vérifications

- `node --test test_inference_guard.mjs test_failure_queue.cjs test_queue_steering.cjs test_fluidity_races.cjs` : quatre fichiers réussis, simulations sans réseau/modèle.
- `python3 -m unittest test_tool_description_mode` : réussi.
- `node --check portal/app.js` et `git diff --check` : réussis.
- Redémarrage après vérification des sessions inactives et warmup `off`.
- GET `/config` : deux plugins déclarés, dont `inference_guard.mjs` ; santé ready ; `/session/status` vide.
- Navigateur réel : accueil/conversation accessibles, brouillon « Brouillon conservé — ne pas envoyer. » intact ; épreuve historique affichée avec le statut de pause après interruption.

La configuration active est observée ; le hook sur une inférence réelle ne l’est
pas, conformément à l’interdiction d’appel au modèle.

## Sources et maintenance

- [Signalement OpenCode du 11 septembre 2026](https://github.com/anomalyco/opencode/issues/48454) : reprises après effets et fins incomplètes sur une branche dev ; ce signalement ne prouve pas seul le comportement installé.
- [API officielle des plugins](https://opencode.ai/docs/plugins/).
- Vérification des sources locales sous `~/.local/share/corpus/toolchains/sources/opencode-1.18.32` : `packages/plugin/src/index.ts` et, sous `packages/opencode/src/`, `session/llm/request.ts`, `session/llm.ts`, `session/processor.ts`, `session/retry.ts`.

Code propre à Corpus sans copie de correctif tiers. À chaque mise à jour moteur,
vérifier le schéma des messages et l’ordre du hook avant le fournisseur.
Retour arrière : retirer `inference_guard.mjs` de `tool_definition_plugins()`
en conservant `plan_guard.mjs`, puis redémarrer le service inactif, warmup off.
