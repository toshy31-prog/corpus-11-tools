# Validation consolidée W5 — 27 septembre 2026

## Résultat observable

Snapshot 0.21.0 gelé après les correctifs des trois agents et le changement de version racine : **797 tests réussis sur 797**, zéro échec, annulation, saut ou todo ; durée 15,119 s. `npm run check` : code 0. Ce sont des preuves locales isolées, pas une observation du service utilisateur ni une comparaison indépendante SOTA.

Copie : `/tmp/scout-validation-w5-MBLj5w`. Données synthétiques : `/tmp/scout-testdata-w5-t2bbKZ`. Copie limitée à package.json, server.mjs, server.test.mjs, lib, public, scripts, tests et patch ; aucune copie de .data, .env ou jetons. Pas d'installation. Environnement vidé ; garde Node héritée bloquant les destinations non-loopback et le port personnel 4181. Ce garde-fou applicatif n'est pas une isolation réseau au niveau noyau.

Commandes exécutées dans la copie :

```sh
env -i PATH=/usr/bin:/bin TMPDIR=/tmp/scout-testdata-w5-t2bbKZ NODE_OPTIONS=--require=/tmp/scout-validation-w5-MBLj5w/network-guard.cjs npm test
env -i PATH=/usr/bin:/bin npm run check
```

Journaux : `test-output.txt`, `check-output.txt`. Manifeste `source-before.sha256` : 264 fichiers ; SHA-256 `60370a5cb59642dbd3fadfd649542a6de25941c6050ffa6317e441350320b74c`. `sha256sum -c` sur les sources originales après exécution : tous conformes, code 0, journal `source-check.txt`. Le manifeste couvre aussi scripts et tests ; les documents ne sont pas dans ce gel exécutable.

## Revues indépendantes

- Diagnostic identité : une vérité terrain manquante faisait auparavant comparer deux `undefined` et compter une acceptation correcte. Reproduction communiquée à l'auteur ; correctif relu : labels propres, chaînes non vides pour références et requêtes, absence explicitement booléenne. Tests inclus dans les 797. Cela sécurise l'instrument de mesure, sans changer le scorer ni prouver sa qualité externe.
- Annulation W5 : trois tests ciblés prouvent arrêt du signal transport, rejet de la file et des attentes cadence/backoff lors du changement de configuration, sans relance de l'ancienne génération. Autre source et nouvelle requête restent utilisables. Le fetch doit coopérer avec AbortSignal pour arrêter physiquement son transport.
- Persistance : `writeStoreSnapshot` réduit les permissions à 0600 y compris un temporaire préexistant, synchronise fichier avant rename puis répertoire. Une erreur après publication est distinguée de l'échec avant publication. Tests d'injection de panne inclus. Aucune simulation de coupure électrique réelle ; la garantie dépend du système de fichiers et du matériel.
- Secrets : LocalSecretFile utilise temporaire exclusif, permissions 0600 et répertoire 0700. Ce n'est pas du chiffrement. Ce chemin ne fait pas fsync fichier/répertoire ; sa durabilité après panne brutale n'est donc pas alignée sur celle des snapshots. Aucun secret réel lu.

## Références primaires revérifiées, et réutilisation bornée

### Fiabilité : chercheurs, industrie, open source

[Gray Failure, Microsoft Research / HotOS 2017](https://www.microsoft.com/en-us/research/publication/gray-failure-achilles-heel-cloud-scale-systems/) souligne qu'un détecteur peut ignorer une défaillance subie par l'application. Application locale : tester l'effet transport/file, pas seulement un booléen de configuration.

[AWS SDK Retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html) documente classification des erreurs, jitter et quota de retries. Attention : la page consultée décrit un comportement 2026 sous opt-in, pas nécessairement tous les SDK installés. Réutilisable : quota anti-amplification et mesures sous panne ; Scout n'a pas démontré une équivalence avec le contrôle adaptatif AWS.

[p-retry](https://github.com/sindresorhus/p-retry), MIT, documente notamment retries bornés et annulation. Réutilisation actuelle conceptuelle via AbortSignal natif ; aucune dépendance ajoutée. La bibliothèque n'est pas un benchmark de service complet.

### Données : chercheurs, industrie, open source

[Ink & Switch, Local-first](https://www.inkandswitch.com/essay/local-first/) situe possession et utilisabilité des données au-delà de leur simple présence locale. À reprendre : exercices de restauration/export et indépendance du fournisseur ; aucune réplication CRDT implantée ici.

[Apple, iCloud data security overview](https://support.apple.com/en-us/102651) distingue des protections de chiffrement et de clés selon les catégories et modes. Scout ne peut pas assimiler permissions POSIX et chiffrement de bout en bout ; aucun service Apple intégré.

[SQLite, Atomic Commit](https://www.sqlite.org/atomiccommit.html) explicite synchronisation et hypothèses de durabilité. Les synchronisations JSON de Scout reprennent un mécanisme utile, pas l'ensemble des transactions, verrous, journalisation et tests de SQLite. Migration éventuelle à évaluer contre besoins multi-processus, pas à déclarer acquise.

## Suite recommandée

Tester la durabilité du chemin de secrets sur fixtures avec fautes injectées, puis un exercice restauration/export sans données personnelles. Root seul gère activation et Git : aucun redémarrage, rechargement du navigateur personnel ou déploiement effectué par cet agent.
