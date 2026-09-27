# Réemploi fiabilité — vague 2, 27 septembre 2026

## Gain borné

`SourceRuntime.request(source, url, { signal })` accepte désormais un AbortSignal optionnel. Les appels existants gardent leur signature et leur comportement sans signal. L'annulation arrête l'attente en file côté appelant, empêche le transport futur, interrompt le transport et la lecture du corps, ainsi que l'intervalle et le backoff. Elle ne déclenche ni retry ni cache périmé de secours. Le cooldown fournisseur ajouté en vague 1 reste actif.

Réemploi de mécanismes, sans copie de bibliothèque ni dépendance ajoutée : [Node 18 AbortSignal](https://nodejs.org/download/release/v18.19.0/docs/api/globals.html#class-abortsignal) pour reason/throwIfAborted et listeners ponctuels ; [p-retry](https://github.com/sindresorhus/p-retry), bibliothèque MIT, pour le contrat d'annulation explicite d'une politique de répétition. Sources primaires consultées le 27 septembre 2026. Composition explicite du délai et du signal appelant, nettoyage des timers/listeners.

## Vérification

Commande : `node --test lib/source-runtime.test.mjs lib/source-runtime-cooldown.test.mjs lib/source-runtime-abort.test.mjs lib/release-adversarial.test.mjs`.

Nouveaux cas synthétiques : pré-annulation sans cache ni transport ; annulation en file avant le premier transport ; autre source utilisable pendant cette file ; annulation en vol transmise au transport et reprise de la file ; annulation pendant intervalle ; annulation pendant backoff sans nouvel appel. Aucune requête externe ni donnée utilisateur. Backup source avant modification : `/tmp/scout-runtime-abort-0atdWo/source-runtime.mjs`.

Critère local : zéro appel commencé après annulation dans ces scénarios ; promesse rejetée sans attendre une opération injectée qui ne termine pas ; suite cooldown inchangée. Cela ne démontre pas une parité globale avec une plateforme de production ni des performances sous charge.

## Limites explicites

Les appels réels dans `server.mjs` (MusicBrainz, Wikidata, Discogs, ListenBrainz, Apple Music, Spotify) héritent maintenant automatiquement du signal de leur store contextuel. `EphemeralExplorations` possède un contrôleur par session ; close et expiration détectée par get/start l'annulent avec erreur HTTP 410. Un signal explicite est combiné avec celui de session, sans pouvoir neutraliser sa fermeture. Annuler le seul appelant ne ferme pas la session. Aucun redémarrage de 4181 : intégration locale écrite et testée, pas effet utilisateur observé.

Trois tests d'intégration supplémentaires dans `lib/ephemeral-runtime-abort.test.mjs` prouvent close/expiration avec transport et file annulés, isolation d'une seconde session, composition du signal appelant, statut idle sans panne fournisseur. Commande finale : `node --test lib/ephemeral-runtime-abort.test.mjs lib/ephemeral-exploration.test.mjs lib/source-runtime-abort.test.mjs lib/source-runtime-cooldown.test.mjs lib/source-runtime.test.mjs lib/release-adversarial.test.mjs` : six fichiers PASS, code 0. L'expiration reste paresseuse, pas de nouveau timer de fermeture automatique.

Une fonction fetch/sleep/parse injectée qui ignore le signal peut continuer son propre travail ; le runtime cesse de l'attendre et ne démarre pas le retry suivant. Une écriture de cache déjà commencée n'est pas transactionnellement annulable. La tâche annulée reste un élément inerte de la file jusqu'à son tour, afin de préserver la sérialisation. Prochaine preuve utile : test HTTP isolé de bout en bout puis mesure contrôlée des appels économisés.
