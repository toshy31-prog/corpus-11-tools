# Correction ciblée : retrouver la fluidité antérieure à 0.16, conserver les gains

## Périmètre et état

Demande : comprendre et retirer la perte de performance par rapport à **avant 0.16**, sans revenir globalement en arrière. Correctif écrit et testé le 22 septembre 2026 ; serveur personnel sur 4181 **non redémarré par ce chantier**. Pas de migration, de suppression de données, de requête à un fournisseur réel ni de modification des accès Google.

Le code client est servi depuis le disque : une absence de redémarrage du serveur n'est pas une garantie d'isolement du client si la page personnelle est rechargée. La validation ci-dessous utilise exclusivement des serveurs et profils de navigateur séparés.

## Référence historique réellement disponible

- Source pré-0.16 exécutable : commit `4dd70f7`, manifeste **0.14.0**, extraite dans `/tmp/scout-performance-cd7zRM/pre016`.
- Source immédiatement avant correctif : **0.17.0**, sauvegardée dans `/tmp/scout-performance-cd7zRM/before.tar`, extraite dans `before`.
- La documentation 0.15 existe mais aucune copie exacte exécutable 0.15 n'a été retrouvée dans les emplacements inspectés. La comparaison ne reconstitue donc pas exactement une session personnelle 0.15.

## Mécanismes observés et corrections

1. **Reconstruction répétée du graphe sécurisé.** Chaque lecture recalculait la projection de sûreté et l'index des relations. Une vue du mélange répétait aussi son diagnostic et le panneau lisait deux vues même sans filtre. Un instantané de lecture profondément immuable réutilise désormais sa projection et son index ; une vue calcule son diagnostic une seule fois. Les graphes mutables ne sont jamais mémorisés, et une correction crée un nouvel instantané.
2. **Copie inutile du cache fournisseur.** `snapshot()` clonait l'ensemble du stockage avant d'en retirer les réponses des fournisseurs. Le cache représentait 7 704 593 octets dans le cas observé. Il n'est désormais cloné que pour une demande explicite `includeCache`, sans changer la sauvegarde ni la persistance.
3. **Budget de recherche absorbé par des réponses déjà disponibles.** Les réponses fraîches en cache ne consomment plus le budget des lectures non cachées. Les clés restent liées à l'URL exacte, aux paramètres, à l'expiration et à la configuration du fournisseur. Les nouvelles lectures restent bornées ; le traitement du cache est lui aussi limité à 80 tâches par étape, avec curseur de reprise et motif visible distinct. Cela ne supprime ni quotas ni délais des fournisseurs.
4. **Détour de la recherche d'alias.** Sans autre projet identifié, elle parcourait les éditions du départ alors que les relations de groupes/alias viennent des fiches artistes. Ce détour est retiré, y compris des anciennes files de reprise. La discographie des projets réellement reliés reste explorable.
5. **Diagnostic d'identité inexact.** Une direction locale sans scène documentée ne classe plus un artiste doté d'une identité catalogue établie comme « départ à identifier ». Une absence de lien reste une absence dans le graphe consulté, pas une affirmation d'exhaustivité des catalogues.

## Mesures locales reproductibles

Lecture seule du même stockage : 6 811 entités, 19 823 relations. SHA-256 du fichier : `d0df8875cd3bf81b9002e1d681b7d2d5fc09d53164019f8c1ff72949c48c2b0f`. Départ RVHIM utilisé uniquement localement. Une chauffe puis neuf mesures par opération ; médianes du dernier passage, Node 24.19.0, même machine. Ce sont des temps CPU de fonctions, **pas des temps de réponse complets de l'application ou des API**.

| Opération | Pré-0.16 disponible (0.14) | 0.17 avant correctif | Corrigé |
| --- | ---: | ---: | ---: |
| Copie du graphe sans cache | 115,76 ms | 109,88 ms | 59,38 ms |
| Diagnostic du départ | 10,12 ms | 27,87 ms | 10,97 ms |
| Huit directions, données inchangées | 81,25 ms | 216,00 ms | 0,24 ms après indexation |
| Nouvel instantané sécurisé + huit directions | sans cette étape | sans cette étape | 109,71 ms |

Le gain récurrent vient de la réutilisation, non de l'omission des contrôles. Le premier calcul corrigé reste ici plus coûteux que le calcul historique 0.14 des huit directions ; on ne conclut pas que toute opération est désormais plus rapide que toute version antérieure. La nouvelle copie immuable a aussi un coût mémoire temporaire, non profilé ici ; les index sont conservés par références faibles.

Les ensembles de candidats sont **identiques entre 0.17 avant correctif et code corrigé** sur ce graphe. La version 0.14 retourne aussi 203 candidats de période que la politique récente exclut : restaurer leur nombre ne constituerait pas en soi une amélioration. Ni les homonymes non établis, ni une décennie seule ne redeviennent des relations admissibles.

Une épreuve synthétique de collaboration, avec trois pages préparatoires en cache et un budget d'une lecture non cachée, donne :

- avant correctif : 0 piste admissible, arrêt sur le budget après une lecture pourtant en cache ;
- après correctif : 6 pistes admissibles après une seule lecture non cachée simulée ;
- ce résultat démontre la progression de la collecte sur cette épreuve, pas la couverture réelle de RVHIM.

Rejouer depuis la racine Scout, avec les sources de comparaison disponibles :

```sh
/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/performance-regression-audit.mjs .data/scout-store.json /tmp/scout-performance-cd7zRM/pre016 /tmp/scout-performance-cd7zRM/before video:youtube:H6Qs9f1rLH4
```

Rapport brut local : `/tmp/scout-performance-cd7zRM/benchmark-final.json`. Le script ne persiste rien et vérifie que le stockage lu n'a pas changé pendant son exécution.

## Épreuves de non-régression

- **673/673 tests réussis**, zéro ignoré. Nouveaux cas : instantanés immuables et invalidation après correction, cache non copié, budget/cache, alias et ancien curseur, absence de scène, progression bornée de 80 pages, calcul unique du diagnostic, portée URL/expiration/configuration du cache, câblage HTTP Discogs et MusicBrainz.
- **26 contrôles Firefox + 26 Chromium réussis** : validation explicite, formulaire stable, correction persistée, réponse tardive rejetée, départs typés, filtres et parcours existants. Données synthétiques ; aucun profil personnel ouvert.
- `git diff --check` réussi.

Commandes exécutées depuis Scout :

```sh
SCOUT_GOOGLE_CLIENT_ID='' SCOUT_GOOGLE_CLIENT_SECRET='' /home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --test-reporter=tap server.test.mjs lib/*.test.mjs public/*.test.mjs tests/*.test.mjs
SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SCOUT_AUDIT_BROWSER=firefox /home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/evolution-browser-audit.mjs
SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs SCOUT_AUDIT_BROWSER=chromium /home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/evolution-browser-audit.mjs
git diff --check
```

La première exécution confinée des tests échouait sur l'ouverture des ports locaux. Les résultats ci-dessus proviennent de leur réexécution autorisée hors confinement, avec fournisseurs locaux simulés. Rapports : `/tmp/scout-performance-cd7zRM/tests-final.tap`, `/tmp/scout-evolution-ui-TH64fG/report.json` (Firefox), `/tmp/scout-evolution-ui-RTlD7S/report.json` (Chromium).

## Ce qui reste non établi

Les délais et la qualité musicale d'une fouille réelle avec les fournisseurs distants n'ont pas été retestés. Les catalogues incomplets, l'extraction des artistes depuis les titres de vidéos et l'ensemble des problèmes visuels signalés ne sont pas déclarés résolus par ce correctif de performance. Aucun retour global à 0.14/0.15, aucune perte volontaire des acquis 0.16/0.17. L'activation complète du service et son observation après redémarrage restent une étape distincte, à autoriser.
