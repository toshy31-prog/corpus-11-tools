# Exploration unifiée — 0.14.4

## Problème constaté

Les captures du 19 septembre montraient deux listes concurrentes : le mix en haut, et les catalogues par direction en bas. Leurs pages et historiques de présentation différaient. Consulter une direction dans le second module ne changeait pas son poids dans le premier ; une route pouvait donc être consultée tout en restant absente du mix.

Le démarrage sélectionne Labels par défaut, sauf choix explicite dans le sélecteur de départ. Les autres poids à zéro n'indiquaient pas une panne : ils désactivaient ces directions, mais cette information était enfouie. Autre défaut : une frontière ne contenant que Labels pouvait donner plusieurs tours à ce catalogue avant d'essayer les directions activées mais absentes de la frontière.

## Changements

- Suppression de la seconde galerie, de ses onglets, de sa pagination et de ses commandes de pause indépendantes.
- Une seule liste, avec un filtre d'affichage par direction. Filtrer ne lance aucune requête et ne change pas les poids.
- Activation et état des huit directions visibles au même endroit. Les potentiomètres et explications de source sont disponibles dans « Dosage et sources ».
- Un seul bouton de recherche, dont le libellé indique le nombre de directions activées. « Activer toutes les directions » conserve la profondeur et la diversité choisies.
- Chaque direction chargeable reçoit un tour avant toute répétition, y compris quand elle est absente de la frontière connue. Le budget reste de huit opérations maximum par clic.
- États distincts : désactivée, non consultée, recherche incomplète, source indisponible et pistes chargées. Une source indisponible reste réessayable sans faire disparaître les anciennes pistes.
- Pagination locale unique ; « Revoir les pistes précédentes » réinitialise seulement l'historique de présentation du départ courant, pas l'historique d'écoute ni les preuves.
- Les anciennes directions mises en pause peuvent être réactivées par le même contrôle.
- Les preuves, actions Écouter/Garder/Continuer, retour au départ et fiche d'identification sont conservés.

Les anciens conteneurs DOM sont inertes et vides pour les parcours de catalogue ; aucune seconde carte de branche/catalogue n'est rendue. Les schémas du graphe et des sauvegardes ne changent pas. Aucune donnée personnelle n'a été supprimée.

## Validation effectuée

Runtime de test : Node 24.19.0 fourni par Codex. Tests navigateur sur profils, serveurs, collections et catalogues jetables ; aucun compte réel, aucun appel externe.

Commandes exécutées :

```sh
/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test server.test.mjs lib/*.test.mjs public/*.test.mjs tests/*.test.mjs
npm run check
npm run check:workflow
git diff --check
SCOUT_AUDIT_BROWSER=firefox SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs /home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/workflow-browser-audit.mjs
SCOUT_AUDIT_BROWSER=chromium SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs /home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/workflow-browser-audit.mjs
```

Résultats :

- 551 tests réussis, zéro échec.
- Vérifications syntaxiques et diff : réussies.
- Firefox : 79 assertions, 172 interactions pilotées, zéro erreur JavaScript non interceptée. Rapport : `/tmp/scout-workflow-ui-ELuIBO/report.json`.
- Chromium : 79 assertions, 172 interactions pilotées, zéro erreur JavaScript non interceptée. Rapport : `/tmp/scout-workflow-ui-caN5Zt/report.json`.
- Les huit boutons d'activation sont actionnés individuellement dans chaque navigateur ; les requêtes des huit directions sont observées après recherche explicite.
- Filtre, pagination, retour à l'historique, arrêt de recherche, ancienne pause, conservation des réglages, confirmation Nexxor, changement de départ, carnet, import/export et largeur mobile vérifiés.
- Test de non-régression spécifique : une frontière réduite à Labels, fortement pondérée, ne bloque pas les sept autres directions, en diversité 0 comme 1.
- Captures desktop/mobile inspectées. Les commandes d'activation mobiles tiennent dans le viewport et ont une cible d'au moins 44 × 44 px.

La méthode de validation des changements a conduit à distinguer trois observations : code testé sur fixtures, fichiers effectivement servis, et résultat obtenu avec les vrais catalogues. Le dernier n'est pas déduit des deux premiers.

## Mise à disposition locale et limites

Le processus identifié sur le port 4181 a été redémarré depuis le répertoire du Scout. `/api/health` annonce 0.14.4. Les contenus servis de `app.js`, `workspace.mjs`, `scout-mixer-panel.mjs`, `scout-mixer-panel.css` et `scout-mix-session.mjs` correspondent exactement aux fichiers locaux.

L'empreinte SHA-256 du stockage personnel avant/après redémarrage est inchangée :

```text
60b5d658dc8d07810ed49281a336e339884ddb4a6413739f3676c81943ea1e99
```

Pas de publication GitHub. Le profil Firefox personnel n'a pas été manipulé. Les tests démontrent l'envoi des recherches et le traitement des réponses simulées ; ils ne prouvent ni la disponibilité des fournisseurs réels ni l'existence de résultats pour chaque direction de Nexxor. Une direction sans lien documenté ne doit pas recevoir de résultat artificiel.

Pour un parcours existant limité à Labels : recharger la page, reprendre le départ, cliquer sur « Activer toutes les directions », puis sur « Chercher dans 8 directions ». Le filtre « Afficher » ne change que la liste visible.
