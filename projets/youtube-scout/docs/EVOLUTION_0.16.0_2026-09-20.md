# Scout 0.16.0 — poursuivre une découverte, sans perdre son parcours

## État réel et décision

Le point de départ est le checkout local 0.15.0 et ses modifications déjà présentes,
pas une reconstruction. Les captures utilisateur documentent des problèmes de
parcours ; plusieurs corrections (Topic, correction personnelle, vrais tris de
date musicale, sélection des morceaux déjà importés) existaient déjà et sont
conservées. La base personnelle n’a pas servi de jeu de test.

Trois options ont été confrontées aux problèmes observés : corriger seulement les
libellés ne ferait pas apparaître les candidats masqués ; remplacer tout le moteur
ferait perdre sa continuité sans gain démontré. L’évolution retenue agit donc sur
la chaîne existante **départ → recherche → résultats → prochain départ**, avec
un traitement séparé de la connexion.

Les skills Corpus de gain de capacité, validation du changement, effets de
méthode et robustesse ont imposé des critères observables : retrouver des pistes
effectivement admissibles, conserver les identifiants et les données, rendre les
filtres réversibles, éprouver les interruptions et distinguer code testé de
service réellement activé. Aucun score global de qualité n’est revendiqué.

## Capacités gagnées

| Limitation constatée | Transformation | Épreuve discriminante |
| --- | --- | --- |
| Playlist ou label traité comme un morceau sans artiste | Parcours propre au type, membres locaux recherchables et paginés, choix d’un morceau ou des liens du conteneur | Playlist → membre ; label sans formulaire artiste ; artiste local → fiche Discogs exacte persistée |
| Lot présent mais entièrement masqué par « Autres artistes » | Même règle d’admissibilité côté collecte et affichage ; poursuite bornée des pages | Premier lot : 0 admissible. Suite simulée : 6 admissibles après 4 appels, preuves cachées conservées |
| Un album monopolise les propositions | Plusieurs sorties/artistes recherchés, diversité appliquée aussi au tri de pertinence | 3 artistes / 3 sorties en 4 appels simulés ; éditions restantes dans le curseur |
| Suggestions recyclées et tri initial confondu avec A–Z | Hasard stable par session, remélange explicite, mémoire distincte des vidéos proposées et artistes explorés | Ordre stable sans geste ; ordre différent après remélange ; recherche exacte prioritaire ; aucun doublon sur 31 pistes paginées |
| Filtre impossible à retirer sur une playlist | Contrôle toujours réversible ; filtre suspendu sans artiste de référence | Cinq cycles cocher/décocher restituent le même vivier sans mutation |
| Expiration Google discrète et reprises fragiles | Bandeau global, mode serveur renouvelable optionnel, reprise bornée de la lecture interrompue | Jetons simulés, expiration, panne, révocation, requêtes concurrentes et changement de compte |
| Miniature recouvrant un titre, menu mobile encombré | Dimensions bornées, un défilement principal, pied de validation stable, compactage mobile | Firefox et Chromium, 1440 / 820 / 390 px ; premier résultat visible et pas de recouvrement |

Les explications de chemin respectent désormais le sens de lecture : un artiste
remixé n’est plus décrit comme le remixeur. Le producteur est distingué du
remixeur. Les relations sources restent conservées.

## Sémantique et coûts

- La recherche vise six candidats admissibles par lecture de direction, avec au
  plus cinq appels fournisseur par lecture. La commande générale conserve son
  plafond de huit opérations, trois au maximum par direction. La consultation
  réelle peut donc coûter davantage de requêtes qu’un arrêt au premier album.
  Les tris et changements de filtres restent locaux, sans appel fournisseur.
- Le scope transmis à `/api/music/branch` est optionnel : les anciens appels
  restent compatibles. Il contient les filtres, identifiants de référence et
  exclusions exactes. Les vidéos déjà importées ne remplissent plus à tort
  l’objectif. Le graphe n’est ni filtré ni effacé.
- Un budget atteint, une source absente, une confirmation nécessaire et la fin
  des liens documentés ont des motifs d’arrêt distincts. Fin du graphe connu
  ne signifie jamais absence de relations dans le monde.
- Le filtre exclut l’artiste de référence, ses co-crédits et les artistes
  inconnus. Il ne bannit pas nominativement Punctum ni un autre projet. Les
  équivalences d’identités exigent toujours des identifiants ou des preuves.
- La pertinence reste un ordre de liens documentés, **pas une similarité sonore**
  ni une probabilité de plaire. La diversité peut faire remonter un autre album
  avant plusieurs titres du même album. Désactiver la diversité reste possible.
- Les suggestions sont renouvelées à l’entrée de leur panneau et lors d’un
  changement de critères. Les vidéos récemment proposées et artistes récemment
  explorés passent après les autres choix admissibles. Un vivier étroit réintroduit
  explicitement les répétitions. Les épingles volontaires restent prioritaires.
- Le hasard réordonne les départs et, sur choix explicite, les découvertes. Il ne
  réinitialise pas les pages consommées. Le carnet garde son ordre d’ajout initial.
- Les dates musicales et d’upload demeurent séparées ; aucune date inconnue n’est
  inventée. Aucun fournisseur d’analyse acoustique n’est ajouté.

## Continuité des données et autorisations

Pas de nouvelle base de bibliothèque, pas de migration destructrice, pas de
fusion par nom. La mémoire de suggestions étend les entrées `presented` existantes ;
elle est incluse dans la sauvegarde Scout. Graphes, carnet, corrections et
historique de pagination sont conservés. La sélection d’une fiche catalogue
distante conserve son ID sans confirmer implicitement l’artiste d’un morceau.

Empreinte du fichier serveur personnel `.data/scout-store.json`, identique au
début et après les tests :
`6e3b72dbfcac00c8b2ac657dffea2a25c031ffdaabf7aba704e2582101e140ff`.
Les tests n’ouvrent pas le profil navigateur personnel. Copie du code pré-travail,
hors `.git` et `.data` : `/tmp/scout-evolution-baseline-jBPK96/source.tar`.
Ce répertoire temporaire est une précaution locale, pas une sauvegarde durable.

Le mode Google renouvelable est **implémenté mais non activé sur le compte réel**.
Il exige une configuration serveur, une URI Google Cloud et le consentement
explicite. Les secrets restent hors projet et exports, protégés par permissions
0700/0600 mais non chiffrés. Les projets Google External/Testing peuvent encore
imposer une expiration après sept jours. Aucune promesse de session perpétuelle.
Voir [configuration, sécurité et références Google](GOOGLE_CONNECTION_CONTINUITY.md).

Aucun push, publication distante, changement Google Cloud, consentement réel ou
modification des playlists YouTube n’a été effectué.

## Validation reproductible

Les fournisseurs et comptes sont simulés, les serveurs écoutent sur des ports
éphémères et les fichiers de test sont temporaires. Aucune découverte réelle n’a
été lancée pour produire ces résultats.

- `node --test server.test.mjs lib/*.test.mjs public/*.test.mjs tests/*.test.mjs` :
  649 tests réussis lors de la passe finale intégrée, aucun ignoré. Journal local :
  `/tmp/scout-evolution-baseline-jBPK96/suite-final.log`.
- `npm run check`, `npm run check:workflow`, `npm run check:connections`,
  `npm run check:evolution`, `git diff --check` : succès.
- `node scripts/workflow-browser-audit.mjs` : 115 contrôles Firefox, 226 actions,
  aucune exception ; `/tmp/scout-workflow-ui-GCjgsN`.
- `node scripts/evolution-browser-audit.mjs` : 21 contrôles par navigateur,
  Firefox `/tmp/scout-evolution-ui-IesGI5`, Chromium `/tmp/scout-evolution-ui-qWxdJv`.
- `node scripts/connection-audit.mjs` : 12 scénarios Chromium,
  `/tmp/scout-connection-audit-PMc04e` (rejoués après les dernières corrections).

Les tests unitaires/HTTP utilisent Node 18.19.1. Les audits navigateur utilisent
Node 24.19.0 et Playwright fourni par le runtime local :
`SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs`.
Node 18 ne satisfait pas la version de Playwright installée ; les premières
tentatives navigateur ont été relancées avec Node 24, sans installer de dépendance.
`SCOUT_AUDIT_BROWSER=chromium` sélectionne Chromium ; Firefox est le défaut des
audits workflow et évolution. L’environnement OAuth réel est désactivé pour les tests.

La revue indépendante a trouvé deux défauts non couverts par les premiers tests
OAuth : panne pendant une reprise après 401 et concurrence lors du changement de
compte. Ils ont été corrigés et des régressions dédiées ont été ajoutées. Les
41 tests OAuth/panneau/HTTP passent, y compris l’oubli demandé avant la réponse
de statut et l’interdiction de réutiliser un jeton déjà refusé après une panne.
Une contre-épreuve indépendante sur les vrais modules, avec réseau synthétique,
a ensuite confirmé : 401 → renouvellement 503 → reprise différée → lecture 200 ;
oubli serveur encore disponible après suspension ; absence de résurrection après
une réponse de statut tardive ; ancien renouvellement incapable d’écraser le
nouveau compte. Aucun compte Google réel n’a été sollicité par cette revue.

## Limites et état de livraison

La couverture des catalogues réels, les quotas et le renouvellement d’un vrai
compte Google restent non vérifiés. Les scénarios synthétiques établissent le
comportement dans leur périmètre, pas la qualité musicale de toutes les suggestions.
Le rendu mobile est un viewport simulé, pas un téléphone physique.

Après accord explicite « go », le serveur personnel sur 4181 a été redémarré le
20 septembre 2026. Vérification finale à 09:55:22 UTC : `/api/health` répond
HTTP 200, `status: ok`, **version 0.16.0**. L’ancien processus 545065 (0.15.0) a été
remplacé par le processus 707227, avec le même runtime, dossier de travail et
environnement, sans afficher ni enregistrer les secrets de cet environnement.

L’empreinte du fichier de données reste identique à celle ci-dessus. Les compteurs
avant/après sont égaux : 6 327 entités, 533 claims, 18 947 relations, 13 événements,
1 639 entrées de cache, 2 périmètres de synchronisation. Les capacités configurées
et la provenance du secret Discogs restent identiques. Cinq modules servis ont été
comparés aux fichiers locaux par SHA-256 : `app.js`, `workspace.mjs`,
`suggestion-memory.mjs`, `connection-panel.mjs`, `scout-mix-session.mjs`.

Le contrôle Google a d’abord été refusé en HTTP 403 sur l’hôte `127.0.0.1` ; il
réussit sur l’origine canonique `localhost`, conformément à sa protection d’origine.
Le statut confirme `configured: false` : aucun renouvellement réel ni consentement
Google n’a été activé. Le navigateur personnel n’a pas été rechargé par le test ;
un rechargement utilisateur reste nécessaire pour charger le nouveau JavaScript.
L’activation Google demeure une étape supplémentaire, soumise à accord.

Trace locale de l’activation : `/tmp/scout-activate-016-RA1y48/activation.json`.
Il s’agit d’une réobservation locale du service et des données, pas d’une nouvelle
épreuve des catalogues externes ou d’un compte Google réel.
