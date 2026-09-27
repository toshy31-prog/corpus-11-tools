# Plateforme Scout : fiabilité et données — 27 septembre 2026

## Méthode et portée

Inspection du code courant et tests locaux isolés autorisés pendant cette tâche. Aucun appel catalogue personnel, redémarrage, installation, migration ni connexion cloud. Références publiques consultées le 27 septembre 2026 ; sélection de mécanismes documentés, pas revue mondiale exhaustive ni classement des fournisseurs. Les publications anciennes ci-dessous restent des références de conception, pas des records récents de performance.

Échelle conventionnelle de preuve, **pas pourcentage de qualité ni probabilité** : 0 absent ; 1 écrit/partiel ; 2 testé historiquement ; 3 testé actuellement sur fixtures ; 4 comparaison indépendante sur benchmark externe. Chaque voie a quatre critères de poids égal, maximum 16. Une réussite de tests écrits ici n'est jamais niveau 4. Critères déclarés pour permettre une future réfutation.

## Voie A — orchestration des sources, quotas, cache et interruption

### État de l'art vérifié

- **Recherche** : [Gray Failure, Microsoft Research / HotOS 2017](https://www.microsoft.com/en-us/research/publication/gray-failure-achilles-heel-cloud-scale-systems/) distingue ce qu'observe l'application de ce que détecte l'infrastructure. Réutiliser des sondes de résultat utilisateur (latence, disponibilité d'une piste admissible), pas seulement des compteurs HTTP. Ne démontre pas que Scout possède un détecteur de panne grise.
- **Grandes plateformes** : [AWS Builders' Library, timeouts/retries/backoff](https://d1.awsstatic.com/builderslibrary/pdfs/timeouts-retries-and-backoff-with-jitter.pdf) : délais bornés, dispersion des relances et prévention de l'amplification. [Google SRE, Handling Overload](https://sre.google/sre-book/handling-overload/) : limitation côté client et budget de retries. [Azure, Circuit Breaker](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker) : suspendre temporairement une dépendance en panne plutôt que multiplier les appels. Ces architectures ne justifient ni leurs coûts cloud ni leurs volumes pour un outil personnel.
- **Open source** : [p-retry, MIT](https://github.com/sindresorhus/p-retry) expose stratégie de retry, budget temporel et interruption. Réutilisable comme référence ou dépendance après autorisation/version figée ; aucune installation ici. Son existence ne remplace pas la politique de quotas des catalogues.

### Observation locale et critères

| Critère falsifiable | Score /4 | Preuve ou manque |
| --- | --- | --- |
| Cache URL-scopé, expiration, provenance fresh/stale et absence de fallback auth | 3 | `lib/source-runtime.test.mjs`, tests actuels cache, URL, 401 et stale |
| Sérialisation et respect d'une pause longue commune à une source | 3 | Nouveau `lib/source-runtime-cooldown.test.mjs`, plus sérialisation existante |
| Annulation transport, file bornée et budget partagé sur la session | 1 | Vérifications de révision et `store.assertActive` ; timeout individuel. Pas de preuve complète d'annulation immédiate du fetch ni limite de queue dans SourceRuntime |
| SLO utilisateur et campagne comparative multi-pannes/latences | 1 | Statuts et compteurs présents ; pas de benchmark indépendant ni SLO calibré |

Total **8/16 = 50 % de cette grille de preuve**. Ne signifie pas « 50 % du niveau Google ».

### Changement livré

Avant : une réponse 429/503 `Retry-After: 120` arrêtait bien la requête courante, mais la requête suivante pouvait contacter immédiatement la même source. Cela contredisait la pause prescrite et multipliait les appels lorsqu'une exploration lançait plusieurs routes.

Après : `SourceRuntime` conserve une échéance en mémoire par source pour les pauses explicites **supérieures à 60 secondes**. Les autres appels à cette source échouent rapidement sans fetch ni attente bloquante jusqu'à expiration ; une copie stale autorisée reste explicitement étiquetée. Les autres sources continuent. Le parseur des dates Retry-After utilise maintenant l'horloge injectée. Les pauses courtes conservent le comportement existant.

Limites : ce n'est pas un circuit breaker adaptatif complet ; pas de partage inter-processus ni persistance après redémarrage ; pas d'interface de compte à rebours ajoutée ; absence de Retry-After ne crée pas de nouvelle pause. La politique ne modifie pas les permissions ni les identités musicales.

### Prochain palier pour égaler les mécanismes utiles

1. Budget temps/appels commun, jitter injectable, file bornée avec rejet explicite.
2. Signal d'annulation propagé jusqu'au fetch et aux attentes ; fixtures avant départ, pendant réponse, pendant backoff.
3. Benchmark reproductible : 429/503, auth, timeout, réponse malformée, cache expiré, concurrence, changement de compte ; mesurer appels inutiles, P95 de résultat admissible, fuite de résultats entre sessions.

## Voie B — stockage, import/export, confidentialité et sécurité

### État de l'art vérifié

- **Recherche** : [Ink & Switch, Local-first software (2019)](https://www.inkandswitch.com/essay/local-first/) formalise contrôle local, utilisation hors ligne et pérennité, sans confondre conservation locale et sécurité automatique. Réutiliser format exportable et absence de dépendance au cloud pour récupérer ses données ; la synchronisation collaborative n'est pas nécessaire au périmètre actuel.
- **Grandes plateformes** : [Apple, Advanced Data Protection](https://support.apple.com/guide/security/advanced-data-protection-for-icloud-sec973254c5f/web) documente chiffrement de bout en bout et récupération pour des catégories de données iCloud. Mécanisme pertinent : séparer clé, données et récupération. Ce n'est ni un composant libre à copier ni une preuve de chiffrement Scout. Les contrôles OAuth existants doivent rester séparés de l'export de bibliothèque.
- **Open source** : [SQLite, atomic commit](https://www.sqlite.org/atomiccommit.html), [domaine public](https://www.sqlite.org/copyright.html) : journalisation et hypothèses de durabilité documentées, candidat pour comparer un stockage transactionnel au JSON. [Automerge](https://github.com/automerge/automerge), licence MIT, [adaptateurs de stockage](https://automerge.org/docs/reference/repositories/storage/) : concurrence et synchronisation locale. [ARK](https://automerge.org/docs/keyhive/ark-api-guide/) ajoute contrôle d'accès et chiffrement : ces propriétés ne sont pas implicites dans un CRDT. Pas de migration ou de serveur public activé.

### Observation locale et critères

| Critère falsifiable | Score /4 | Preuve ou manque |
| --- | --- | --- |
| Persistance ordonnée, clés distinctes, rejet des lots invalides | 3 | `lib/persistent-store.test.mjs` actuel ; snapshots, écritures et protection des confirmations |
| Restauration conserve l'état en cas d'échec local | 3 | `lib/restore-continuity.test.mjs` actuel : snapshot, base et quota simulés ; pas navigateur réel |
| OAuth / frontières locales / absence d'exposition des secrets | 3 | `lib/google-oauth.test.mjs` actuel : origine, PKCE, état, rotation et fichiers temporaires ; pas pentest complet |
| Durabilité après crash physique, concurrence multi-processus et récupération indépendante | 1 | `persist` écrit `.tmp` mode 0600 puis rename ; pas fsync ni protocole multi-écrivain dans ce module, pas campagne power-loss |

Total **10/16 = 62,5 % de cette grille de preuve**. Les données ne sont pas réputées chiffrées parce que le fichier a un mode restrictif. Les exports/imports ne sont pas tous couverts par la sonde de restauration.

### Réutilisation et critères d'acceptation

Priorité : vérifier crash/reprise et erreur d'écriture avant d'envisager SQLite. Une migration exigerait export réversible, comparaison byte/record des décisions personnelles, essais de corruption, plan de retour et autorisation. Automerge n'apporte un gain justifié que si la concurrence multi-appareils devient un objectif ; pas de dépendance ajoutée « pour faire SOTA ». Chiffrement optionnel des exports doit traiter perte de clé et récupération, pas seulement cacher le JSON.

## Exécution et contre-épreuve locale

- `node --test lib/source-runtime.test.mjs lib/source-runtime-cooldown.test.mjs lib/persistent-store.test.mjs` : code 0, 3 fichiers réussis, 0 échec (le reporter de cet environnement agrège par fichier).
- `node --test lib/restore-continuity.test.mjs` : code 0, 1 fichier réussi.
- `node --test lib/google-oauth.test.mjs` : code 0, 1 fichier réussi, 0 échec ; fixtures et fichiers temporaires uniquement.
- Même nouvelle suite cooldown contre la copie **avant patch** dans `/tmp/scout-platform-sota-XzbySW` : code 1, fichier échoué ; contre code courant : code 0. Contre-épreuve locale conçue par le même auteur, non indépendante.
- Sauvegarde : `/tmp/scout-platform-sota-XzbySW/source-runtime.mjs`. Seul module de production modifié : `lib/source-runtime.mjs` ; aucune donnée utilisateur modifiée.

Conclusion : un défaut borné de respect de pause fournisseur est corrigé et testé localement. Le palier état de l'art global n'est **pas établi** : il manque notamment annulation complète, SLO, essais crash réels et comparaison indépendante. La méthode change-validation impose de ne pas transformer ces tests en affirmation de déploiement ou de supériorité.
