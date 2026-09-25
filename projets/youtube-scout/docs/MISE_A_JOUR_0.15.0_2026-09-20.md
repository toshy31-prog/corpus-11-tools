# Scout 0.15.0 — identification, parcours et tri

## Changements locaux

- Les titres seuls comme GREEN DAY ou John Gotti (Freestyle) ne préremplissent plus le nom d’artiste. Les crédits explicites de description et les chaînes Topic sont des indices sourcés, pas des identités catalogue automatiquement confirmées. Le contexte est transmis au résolveur et conservé dans les pistes YouTube utilisées comme nouveaux départs.
- Les corrections personnelles accompagnent le lancement commun. Un seul contrat : choisir une suggestion (y compris dans les autres départs), puis « Explorer ce départ ». Retrait des actions Garder / Déjà vue de ce sélecteur ; le carnet existant n’est pas effacé.
- Recherche d’artiste : noms courts exacts ou alias exact, classement avant limitation, contexte de désambiguïsation. TH ne correspond plus à The Black Tone, Dj.Booth ou State of the Art. Les homonymes restent séparés, sauf identifiants identiques ou relation d’identité établie. Option Aucun de ces artistes et saisie d’une fiche artiste HTTPS Discogs/MusicBrainz avec validation du domaine et de l’identifiant. La recherche ne crée pas d’identité dans le graphe.
- Un seul panneau de découverte. Artiste, titre et chaîne sont séparés. Directions, dosages, profondeur, tri et options suivent le départ suivant. Un filtre ciblant une direction désactivée revient aux directions actives, sans effacer les pistes chargées.
- La recherche initiale garde un état occupé pendant toute sa file de lectures. Erreur fournisseur, attente, absence de correspondance, pistes masquées et liste parcourue ont des messages distincts. Possibilité de reprendre l’identification ou d’explorer la chaîne sans confirmer une identité d’artiste.
- Collecte et mélange : diversification des artistes et albums, conservation de tous les identifiants. Un label dont la taille connue atteint 500 sorties est un lien éditorial large, masqué par défaut sauf départ explicite de ce label ou autre crédit direct actif vers cette piste. L’option « Inclure les liens éloignés » conserve l’accès. Aucun artiste n’est interdit nominativement.

## Tri et autres artistes

Tris : sélection équilibrée, titre naturel 0–9/A–Z ou Z–A, sortie musicale récente/ancienne, artiste A–Z ; pertinence du lien en plus pour les découvertes. Le carnet conserve son ordre d’ajout par défaut. Les tris sont appliqués avant pagination, sur les pistes chargées restant à parcourir. Pour inclure de nouveau les pages précédentes, utiliser « Recommencer les pages du départ ».

La date d’upload YouTube ne remplace jamais la date musicale. Priorité à la première sortie connue ; une réédition sans première date connue reste inconnue pour ce tri. Le champ Released on d’une description de distribution musicale est utilisable comme date musicale. Dates inconnues en fin de liste dans les deux sens. Les anciens éléments du carnet sans date ne sont pas enrichis artificiellement.

« Pertinence du lien » est un ordre explicable, non un pourcentage : crédits de remix/collaboration/projet, compilation commune, label commun, contexte documenté, chaîne commune, lien de grand catalogue. À niveau égal, préférence au chemin documenté le plus court. Cette convention ne mesure ni le son ni la probabilité de plaire.

« Autres artistes uniquement » filtre la liste déjà reliée au départ. Exclusion de l’artiste de départ et des pistes où il participe, par identifiants établis et noms affichés normalisés ; les artistes non renseignés sont masqués. Les identifiants d’artiste équivalents sont suivis uniquement sur des liens d’identité confirmés. Une exclusion de vue par nom ne fusionne aucune identité. Le filtre est réversible et ne modifie pas bibliothèque, carnet ou graphe.

## Validation et limites

Les tests automatisés utilisent des graphes, fournisseurs, comptes et playlists fictifs. L’audit navigateur couvre choix, annulation, correction, panne, confirmation, directions, tri, filtre artistes, pagination de 200 vidéos, reprise, clavier, mobile, faible hauteur, sauvegarde et restauration isolées. Le compte utilisateur et ses données personnelles ne servent pas de banc de test.

Les résultats exacts des dernières exécutions sont consignés à la fin de ce document. Les contrôles ne démontrent pas que TH, YH 261, Jeune Morty ou DavidDeuxFois sont identifiables dans chaque catalogue réel. Leur disponibilité réelle, les consentements Google et les quotas réels restent non testés. Aucune analyse acoustique n’est ajoutée.

Le seuil de 500 sorties est une règle produit de prudence, pas une mesure scientifique de proximité. Un ancien cache de label sans taille connue n’est pas classé arbitrairement comme grand catalogue : il doit être enrichi par une lecture explicite ultérieure. Les sources connues restent conservées ; une indisponibilité n’est jamais convertie en absence démontrée.

Les skills de validation de changement et de robustesse ont guidé la séparation entre code écrit, tests isolés et serveur effectivement relancé. L’audit des effets de l’interface a guidé la distinction entre absence, filtrage et erreur.

## Exécutions vérifiées le 20 septembre 2026

Runtime : Node 24.19.0, `/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`.

- `node --test server.test.mjs lib/*.test.mjs public/*.test.mjs tests/*.test.mjs` : **585 / 585**, aucun test ignoré. Journal `/tmp/scout-suite-20260920.log`.
- `npm run check:workflow`, `npm run check`, `git diff --check` : succès.
- `SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node scripts/workflow-browser-audit.mjs` : Firefox, **115 contrôles**, 226 actions pilotées, aucune erreur navigateur non interceptée ; captures et rapport `/tmp/scout-workflow-ui-GswKXK`.
- Même commande précédée de `SCOUT_AUDIT_BROWSER=chromium` : **115 contrôles**, 226 actions pilotées ; rapport `/tmp/scout-workflow-ui-tkWJnb`. Dernière exécution Chromium avant la modification cosmétique finale des libellés/espacements, sans changement des interactions ensuite.
- Serveur personnel local relancé avec le même répertoire et la configuration existante. Lecture de `/api/health` : HTTP 200, version **0.15.0** ; nouveaux modules servis en HTTP 200. Pas de requête de découverte réelle lancée pendant cette vérification.
- Copie de précaution du fichier serveur dans `/tmp/scout-pre-015-PgrvNJ/scout-store.json`. Empreinte SHA-256 identique avant sauvegarde, dans la copie et après redémarrage. Aucun effacement de bibliothèque, de carnet ou de session personnelle.

La page déjà ouverte peut encore exécuter l’ancien JavaScript : la recharger pour obtenir l’interface 0.15.0. Aucun push ni publication distante.
