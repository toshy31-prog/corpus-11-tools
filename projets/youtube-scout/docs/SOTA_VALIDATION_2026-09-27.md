# Validation transversale isolée — 27 septembre 2026

## Périmètre et séparation des rôles

Relecture des changements identité, convergence des découvertes et sélection des directions par un agent différent de leurs auteurs. Ce second regard interne n'est pas un benchmark externe indépendant. Le changement SourceRuntime est relu par son auteur ; ne pas lui attribuer l'indépendance des autres revues.

Les tests ont été explicitement autorisés en cours de tâche. Aucun service personnel4181 arrêté/rechargé, aucune installation, aucune donnée de bibliothèque ni secret utilisé, aucun appel fournisseur voulu. Pas de test navigateur réel ni de performance musicale mesurée.

## Isolation

- Copie par liste positive dans `/tmp/scout-validation-56EU1a` : `package.json`, `server.mjs`, `server.test.mjs`, `lib`, `public`, `scripts`, `tests`, puis `patch` requis par un test. Pas de `.data`, `.env`, jeton ou dossier vendor copié.
- Environnement vidé (`env -i`), PATH système, Node18.19.1. Données temporaires séparées : `/tmp/scout-testdata-zsnk5W`.
- Préchargement local `network-guard.cjs` : `fetch`, HTTP/HTTPS et résolution DNS limités à la boucle locale ; port4181 interdit. Fixtures HTTP uniquement sur ports temporaires.
- Bubblewrap essayé mais refusé par le noyau (création de namespace interdite). Le preload n'est pas un confinement de sécurité équivalent à un namespace : il ne couvre pas un binaire natif hostile. Le code de tests a été inspecté et ne constitue pas un tel adversaire.
- Exécution hors sandbox autorisée par l'outil après échec `listen EPERM` dans le sandbox. Ce droit sert uniquement aux serveurs temporaires de fixtures, pas au service utilisateur.

## Premier passage : erreurs du harnais, non régressions attribuées au patch

Un premier lancement dans le sandbox donne97 fichiers réussis /105,8 échoués. Diagnostic : cinq fichiers HTTP ne peuvent écouter (`EPERM`), coffre OAuth refuse un TMPDIR situé **dans la copie du projet** (protection attendue), import `patch/explorer-state-policy.mjs` omis dans la copie initiale, sortie du sous-processus smoke non disponible dans ce contexte. Les résultats de ce premier harnais ne sont pas assimilés à des bugs de production. La copie et le TMPDIR ont été rectifiés ; le lancement autorisé suivant distingue ces causes.

## Passage global #1

Copie comprenant les changements identité, discovery, plateforme et UI de sélection. Commandes depuis la copie :

```sh
env -i PATH=/usr/bin:/bin TMPDIR=/tmp/scout-testdata-zsnk5W NODE_OPTIONS=--require=/tmp/scout-validation-56EU1a/network-guard.cjs npm test
env -i PATH=/usr/bin:/bin TMPDIR=/tmp/scout-testdata-zsnk5W NODE_OPTIONS=--require=/tmp/scout-validation-56EU1a/network-guard.cjs npm run check
```

Résultat : **739 tests passés /739,0 échec,0 ignoré**,14,56s,code0. `npm run check` : code0. Journaux : `/tmp/scout-validation-56EU1a/final-test-output.txt`, `/tmp/scout-validation-56EU1a/check-output.txt`.

## Relecture indépendante des changements

| Lot | Lecture | Limite restante |
| --- | --- | --- |
| Identité | Vérifie tous les participants attendus avant auto-acceptation et conserve l'ambiguïté prioritaire ; ne modifie pas les candidats | Correspondance de noms par seuil0,92, pas preuve cross-ID ; pas de corpus humain indépendant |
| Discovery | Replay exact ne multiplie plus les explications ; paths/preuves différents conservés ; aucune fusion des identités du graphe | Clé JSON sensible à l'ordre des propriétés ; idempotence syntaxique, pas canonisation sémantique |
| UI | Poids/intention séparé d'activation effective ; direction en attente peut être désélectionnée ; aria-pressed suit l'intention | Tests logiques, pas clavier/lecteur d'écran en vrai navigateur |
| Évaluateur hors ligne | Formules nDCG et recall cohérentes ; absence de jugement reste inconnue ; abstention visible | Fixtures synthétiques ne mesurent aucune qualité musicale |

Aucun défaut bloquant identifié dans ces changements bornés. Cela ne certifie pas toutes les relations catalogue historiques ni les huit directions sur données réelles.

## Passage global final #2

Après stabilisation : dernier libellé UI « Remixeurs et producteurs » et évaluateur hors ligne avec9 tests, dont validation des métadonnées artistes et propriétés héritées. Même harnais et commandes que le passage#1.

**748 tests passés /748,0 échec,0 ignoré**,14,82s,code0. `npm run check` : code0. Journaux complets : `/tmp/scout-validation-56EU1a/snapshot2-test-output.txt` et `/tmp/scout-validation-56EU1a/snapshot2-check-output.txt`.

SHA-256 identiques entre copie testée et projet source lors du snapshot :

```text
37432319e10ecd95fda4e47f1fcaec975836ec3214e7da9c3e0ccffe49322164  lib/source-runtime.mjs
eb1b6ded146e779b29bf05d577d1ab284407d0197d545004191686ab7d4c97c2  lib/track-candidate-score.mjs
120991a12c8e22bedc367bf82ac4ed5173f00e2b34f7ab97b35f0a0269692b7f  public/discovery-frontier.mjs
93922e57447a77155160817ad77694ec0a206c60b616b3ef53143dd898885b1e  public/scout-mixer-panel.mjs
9c7ad19d3cfda41389e6ce317c63e8221dc32fd08bc68cd16b27488ac1404b89  scripts/offline-ranking-metrics.mjs
```

La revue séparée a conduit au renfort `artistsById` avant le dernier passage. Pas de correction supplémentaire des autres modules. Les échecs initiaux du harnais ne se reproduisent pas dans le passage final ; aucune régression restante démontrée par cette suite.

## État de livraison

Écrit et testé localement sur copie isolée. **Non déployé, non réobservé dans la session utilisateur, non comparé à un benchmark externe.** Aucun résultat local ne permet d'annoncer « état de l'art mondial atteint ».
