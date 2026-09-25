# Pagination et lisibilité — 0.14.5

## Défauts reproduits

1. Le plafond de diversité des chaînes était appliqué à la liste entière avant le calcul des candidats. Une chaîne de 200 vidéos devenait un seul candidat : le bouton de pagination était désactivé. Quatre nouveaux tests échouaient avant correction (200 vidéos, compteur mixte, chaîne seule, remplissage de dernière page).
2. Après rejet puis reconfirmation de l’artiste, le filtre de l’ancienne exploration restait actif. Le test navigateur a reproduit un écran vide malgré des résultats Labels : le filtre Chaînes YouTube les masquait.
3. Une mise à jour reconstruisait toutes les cartes, refermant les preuves ouvertes, même lorsque leurs données ne changeaient pas.

## Corrections

- La diversité s’applique à la page, sans supprimer les autres candidats. Dans un mélange, les autres sources restent prioritaires après le quota d’une chaîne ; les places restantes sont remplies. Une route filtrée ou seule peut afficher six vidéos d’une même chaîne.
- `Page suivante` consomme seulement les cartes réellement présentées. `Recommencer la liste` réinitialise leur historique d’affichage, pas la bibliothèque, le carnet ou l’historique d’écoute.
- Un filtre est réinitialisé lors d’une correction d’identité ou d’un changement de départ.
- Une seule galerie ; aucun retour du second module de routes.
- Les huit directions, leurs dosages et les paramètres de diversité/profondeur sont regroupés dans `Directions et réglages`, replié par défaut. Les directions actives restent résumées sur le panneau fermé.
- Le compteur distingue les pistes de la page des autres pistes encore disponibles. Le filtre explicite les autres directions masquées et propose `Retirer le filtre`.
- La recherche indique le nombre de directions effectivement chargeables. Aucune requête externe n’est déclenchée par la pagination ou un réglage.
- Les cartes inchangées gardent leur DOM, leur preuve ouverte et leur focus. Les preuves ouvertes sont aussi conservées lors d’un remplacement de carte mis à jour.

Pas de changement de schéma ni de migration des données. Aucun rapprochement d’artistes ajouté. Les plafonds de requêtes et la nécessité de preuves sont conservés.

## Vérifications

Runtime Node 24.19.0. Commandes exécutées :

```sh
/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test server.test.mjs lib/*.test.mjs public/*.test.mjs tests/*.test.mjs
npm run check
npm run check:workflow
git diff --check
SCOUT_AUDIT_BROWSER=firefox SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs /home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/workflow-browser-audit.mjs
SCOUT_AUDIT_BROWSER=chromium SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs /home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/workflow-browser-audit.mjs
```

- 555 tests réussis. Le test unitaire parcourt les 200 vidéos sur 34 pages sans perte ni répétition.
- Firefox et Chromium : chacun 91 assertions et 206 interactions pilotées, zéro erreur JavaScript non interceptée. Serveurs, profils, comptes et catalogues synthétiques isolés ; sorties réseau externes bloquées/simulées.
- L’audit navigateur charge réellement quatre pages simulées de publications de la même chaîne via le client applicatif, puis parcourt huit pages locales sans doublon ni nouvelle requête de catalogue. Source indisponible, reprise, changement d’identité, filtres, huit boutons d’activation, dosages, annulation, carnet et sauvegarde/restauration sont également exercés.
- Captures desktop/mobile inspectées. Pas de débordement horizontal à 390 px ; cibles d’activation d’au moins 44 × 44 px.
- Rapports temporaires : `/tmp/scout-workflow-ui-FM1Avn/report.json` (Firefox), `/tmp/scout-workflow-ui-8cif6A/report.json` (Chromium).
- Rejeu en lecture seule du calcul sur la session personnelle, sans sauvegarde ni appel fournisseur : 6 cartes sur 200 candidats pour Chaînes YouTube ; 6 sur 55 pour Période (87 entrées chargées avant exclusions/dédoublonnage du sélecteur). Dans les deux cas, une page suivante est disponible.

La compétence de validation des changements a conduit à conserver les échecs initiaux, ajouter le scénario absent des anciennes fixtures, puis distinguer tests isolés, rejeu local réel et fichiers servis.

## Version effectivement servie

Le serveur local identifié a été redémarré. `/api/health` annonce **0.14.5** sur le port 4181. Les contenus servis de `app.js`, `scout-mixer-panel.mjs`, `scout-mixer-panel.css` et `scout-mix-session.mjs` sont identiques aux fichiers locaux.

Empreinte du stockage personnel avant et après redémarrage, inchangée : `32a66e860921b6082edb5a17d09f9b9e5244018d227a6f4d672b8ef3973f9f1d`.

Recharger la page puis reprendre l’exploration suffit ; aucun réimport de bibliothèque n’est nécessaire.

## Limites

Ce n’est pas une certification exhaustive de sécurité ou de tous les parcours possibles. L’authentification des comptes personnels et la disponibilité actuelle des fournisseurs réels n’ont pas été retestées. Aucune piste n’est inventée pour remplir une direction sans lien documenté. Les essais sur fixtures ne prouvent pas l’existence de remixes ou d’alias supplémentaires de Nexxor.

Les rapports et captures sont temporaires, hors dépôt. Aucune publication GitHub ni modification du profil Firefox personnel.
