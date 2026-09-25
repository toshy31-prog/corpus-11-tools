# Consolidation locale — 19 septembre 2026

## Périmètre livré

Cette passe consolide les modifications locales présentes dans YouTube Scout, sans remplacer leur architecture, purger les données personnelles, modifier les comptes ou publier sur GitHub. Elle ne clôt pas toute la feuille de route historique.

| Défaut constaté | Correction | Vérification |
| --- | --- | --- |
| Chaque itération DIG repartait avec des compteurs de répartition à zéro ; les premières voies pouvaient monopoliser le budget. | Allocations cumulées transmises au scheduler ; une seule implémentation partagée navigateur/serveur. | Exécution de la vraie boucle applicative en VM : les huit directions activées sont servies avant repagination. |
| La durée disparaissait entre projection et décision ; le cache serveur regroupait des demandes distinctes. | Durée normalisée et clé incluant titre, hypothèse artiste, durée, contexte Bandcamp et configuration Discogs. | Tests métier et deux requêtes HTTP de durées contradictoires. |
| Les résultats de recherche Discogs étaient des éditions, sans pistes utilisables par la décision moderne. | Hydratation bornée à trois éditions ; décision sur tracklists ; graphe piste/artistes/remixeur/label. | HTTP et graphe sur fixtures ; pas de faux MBID, ambiguïtés et versions contradictoires non acceptées. |
| Le dernier parcours était enregistré sans action de reprise visible. | Bouton Reprendre explicite au démarrage et après restauration ; aucune recherche fournisseur automatique. | Rechargement, reprise, continuation et retour dans un profil jetable. |
| Les cartes mobiles restaient sur une colonne de 105 px à cause de la priorité d’un sélecteur CSS. | Correction du sélecteur mobile et actions d’au moins 44 px de haut. | Largeur utile et boutons contrôlés, capture examinée visuellement. |
| Des assertions ne suivaient plus le câblage actuel. | Harness de guidance et contrats de priorité/texte actualisés ; nouveaux tests comportementaux. | Suite locale complète verte. |
| Le runner Node découvrait automatiquement un ancien script réseau réel. | Liste explicite des tests locaux, double garde du script live : consentement `--allow-network` et interdiction sous le runner. | Sous-processus sans opt-in et sous runner : sortie avant lecture des entrées et secrets. |

L’interface distingue désormais les pistes réellement lues dans Discogs des simples indices d’édition. Une lecture partielle est signalée ; une correspondance proposée n’est pas présentée comme confirmée.

## Validation observée

- `npm run check` : succès.
- `npm run check:consolidation` : succès.
- `npm run check:connections` : succès.
- `git diff --check` : succès.
- `npm test` sous Node **18.19.1** : **514/514**, aucun échec, aucun test ignoré.
- Parcours Chromium isolé, exécuté avec Node 24 : **16 contrôles** réussis : choix au clavier, collection active, fermeture du sélecteur, contrôles locaux sans réseau, NEXT distinct, carnet persistant, démarrage neutre, reprise explicite sans recherches fournisseurs, continuer/retour, largeur et actions mobiles, absence d’erreur JavaScript non interceptée.
- Connexions Chromium isolées : **12 scénarios** réussis : mémoire de l’ID, panneau replié après vérification, saisie de playlists indépendante, reprise OAuth sans popup, mobile, jeton refusé, reconnexion, clé publique persistante, déconnexion locale, erreur visible, oubli de clé et absence d’erreur JavaScript.
- Serveur local lancé avec `npm start` après vérification du port libre : `/api/health` renvoie **HTTP 200 / ok** ; le hash du `app.js` servi est identique à celui du fichier corrigé. Aucun processus préexistant n’a été arrêté.

Les fixtures utilisent des répertoires temporaires et un navigateur neuf. Elles ne certifient pas la connexion Google réelle, la qualité de chaque résultat Discogs ni le comportement de Firefox.

### Anomalie de validation détectée

Avant la séparation ci-dessus, `node --test` incluait `scripts/test-live-track-resolution-queue-one.mjs`. Le contrôle final a montré **six recherches réelles en lecture seule** sur un cas de sa file locale, avec lecture du jeton Discogs local par cet ancien script. Celui-ci ne modifie pas le graphe Scout. Ce comportement implicite n’était pas une validation isolée et ne doit pas être reproduit ; la suite finale de 514 tests l’exclut et vérifie son verrouillage. Aucun jeton n’a été reproduit dans le rapport.

## Limites et suites utiles

1. **Couverture des directions** : la matrice de `public/departure-profile.mjs` contient encore des `source_gap` et `orchestration_gap`, notamment pour certaines combinaisons artiste/label/playlist et chaîne, territoire, époque, compilation. Une voie visible n’équivaut pas à un connecteur complet.
2. **Hydratation bornée** : trois éditions maximum par résolution, cinq cents entrées maximum par tracklist. Un timeout conserve les données disponibles et signale une lecture partielle. Plusieurs éditions équivalentes peuvent rester ambiguës ; aucune fusion automatique n’est ajoutée pour les forcer.
3. **Sources musicales** : Bandcamp reste un apport fourni ou confirmé ; cette passe n’installe pas un scraper général. Les tests ne démontrent aucune exclusivité ou avance de publication Spotify.
4. **Données antérieures** : aucun ancien graphe n’a été purgé. Une relation déjà contaminée reste un sujet de réparation explicite, avec preuve et sauvegarde, pas une suppression aveugle.
5. **Validation réelle** : un prochain essai avec les comptes et quelques morceaux choisis nécessite l’accord de l’utilisateur et un budget réseau explicite. Il faut alors examiner pertinence, latence, versions et chemins, pas seulement le statut HTTP.
6. **Git** : le dépôt contenait déjà de nombreuses modifications et de nouveaux modules au début de la passe. Ils ont été préservés. Aucun commit, staging ou push n’est présenté comme réalisé ; le checkout local n’est pas une release publiée.

La priorité suivante est de mesurer le parcours réel sur quelques départs représentatifs, puis de compléter les directions réellement manquantes. Il ne faut pas ajouter des réglages qui masquent une absence de données ou de connecteur.
