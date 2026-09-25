> **DOCUMENT HISTORIQUE** — les nombres de tests, statuts et étapes ci-dessous décrivent le moment de leur rédaction. Pour l’état courant, voir `README.md`.

# Audit debug et refonte UI/UX — 0.14.0

13 septembre 2026. Audit du code local, tests automatisés et parcours navigateur
sur données isolées. Cette livraison ne constitue ni un audit de sécurité certifié,
ni une vérification exhaustive des catalogues et comptes externes.

## Résultat

Le Scout est organisé en trois espaces : **Explorer**, **Carnet**,
**Bibliothèque & sources**. Une direction de fouille est affichée à la fois.
Le moteur garde ses exigences de preuve : une identité probable n’est pas une
identité confirmée ; une playlist commune ne prouve pas un label commun.

Validation finale : **150/150 tests sous Node 18.19.1**, **150/150 sous
Node 24.19.0**, **36 scénarios navigateur Chromium**. Aucun test ignoré ou annulé.
Les tests navigateur utilisent leur propre serveur, base et profil ; les appels
externes sont interceptés ou bloqués. La bibliothèque et les secrets personnels
ne sont pas des fixtures de test.

## Défauts corrigés pendant cet audit

### Ajustement demandé : connexion compacte et mémorisée

Les champs YouTube se replient après un contrôle API réussi ; un ID mémorisé
n’est pas présenté comme une connexion. L’import par URL reste indépendant.
La clé publique est désormais persistante dans `localStorage` ; le jeton OAuth
vérifié est limité à `sessionStorage`, lié à son client et à son expiration.
Au rechargement, il est revérifié sans ouvrir de fenêtre Google. Le renouvellement
après expiration demande toujours une action de l’utilisateur. Les secrets restent
hors des exports ; le stockage navigateur n’est pas chiffré.

Validation de cet ajustement : **162/162 tests Node 18**, dont 12 nouveaux tests
du contrôleur de connexion ; **36 scénarios Chromium de régression** et **12
contrôles navigateur de connexion** avec Google simulé. Reprise après recharge,
401, 403, suppression de clé, absence de consentement forcé, réponses tardives,
configuration réouvrable et affichage à 390 px sont exercés. `npm run
check:connections` vérifie les nouveaux modules. Le script reproductible est
`npm run audit:connections` (Playwright requis, même configuration que l’audit
navigateur principal). Ces résultats ne valident pas les identifiants personnels.

Le serveur local a été démarré sur le port libre 4181 et sert le nouveau module ;
l’onglet personnel n’a pas été rechargé automatiquement pour préserver son accès
Google encore en mémoire dans l’ancienne interface.

### Audit initial

| Défaut constaté | Correction | Vérification |
| --- | --- | --- |
| Accumulation des réglages, branches et résultats sur une seule longue page | Trois espaces, sélecteur de départ en fenêtre, une direction visible, détails repliables | Navigation réelle et captures desktop/mobile |
| Relance difficile à comprendre | Exploration et reprise limitées à la direction choisie ; commandes d’attente et de mise de côté | Erreur simulée sur un remix, reprise de cette seule direction, conservation des labels |
| Geste « De côté » perdu lors d’un rechargement immédiat | Copie navigateur synchrone avant les écritures asynchrones ; anciennes écritures sans retour en arrière de cette copie | Rechargement immédiat dans Chromium et test d’une file d’écriture bloquée |
| Annulation d’un retrait risquant de restaurer une ancienne note | Capture de la dernière version de la piste au moment du retrait | Modification, retrait puis annulation sans rechargement intermédiaire |
| Cache contenant des objets URL non copiables sous Node 24 | URL de provenance stockées sous forme de chaînes | Relecture du graphe, cache, confirmation Discogs sous les deux versions de Node |
| Nouvelle tentative malgré une erreur d’authentification non temporaire | Arrêt des répétitions sur les erreurs non réessayables | Une réponse 401 provoque un seul appel |
| Requêtes identiques déjà en file redemandant la même donnée | Nouvelle lecture du cache au début de l’exécution | Deux demandes simultanées, un seul appel réseau simulé |
| Une écriture disque en échec empêchant les suivantes | Reprise de la file après échec, erreur courante toujours signalée | Échec puis nouvelle écriture et relecture |
| Pagination YouTube susceptible de boucler sur le même jeton | Détection des jetons répétés, conservation des pages déjà valides | Boucle de pagination simulée et import de 5 000 vidéos |
| Écritures API insuffisamment protégées contre une autre origine | Contrôle d’origine et du type JSON des écritures ; rejet des corps invalides et identifiants réservés | 400/403/415 attendus, graphe non modifié par les requêtes rejetées |
| Rechargements interprétés comme des migrations successives | Version du moteur enregistrée avec chaque parcours sauvegardé | Reprise et retour arrière dans le navigateur |
| Import Bandcamp réservé au JSON technique | Formulaire URL, artiste, sortie, label facultatif et pistes ; JSON toujours disponible | Les deux imports passent par la même validation et le même stockage local |

Les protections déjà présentes contre les homonymes et les faux chemins ont été
rejouées, pas revendiquées comme de nouvelles corrections de cette version.

## Contenu de la refonte

- Navigation persistante sur ordinateur, barre inférieure sur mobile.
- Recherche **locale** des départs importés/documentés, résultats cliquables et
  affichage progressif. Ctrl/Cmd+K ouvre le sélecteur, Échap le ferme.
- Onglets Labels, Remixeurs, Collaborations, Compilations, Alias & projets,
  Chaînes, Territoires et Époque. Les états sont visibles sur chaque onglet.
- Sources, preuves et réglages avancés restent accessibles sans occuper toute
  la page. Les collaborations des playlists sont dans une section repliable.
- Écoute, recherche d’écoute et ouverture d’une fiche restent distinctes.
- Liens de recherche Bandcamp et Discogs directement sur le départ actif.
- Carnet séparé : recherche, filtres, classement, notes, export, annulation d’un
  retrait et indication d’enregistrement.
- Réinitialisation isolée des gestes courants ; notifications d’erreur visibles.
- Contrastes renforcés, focus clavier visible, commandes agrandies et suppression
  des débordements horizontaux vérifiés à 390 px.

## Fonctions examinées et preuves disponibles

| Domaine | Ce qui est testé | Ce qui ne l’est pas sur un compte réel |
| --- | --- | --- |
| Import YouTube | Lecture, dédoublonnage, plafond 5 000, pagination, reprise, import partiel non destructif, restauration du cache | Consentement OAuth réel, quotas et disponibilité des vidéos privées |
| Résolveur | Titre/version/code catalogue, rapprochement du recording, identifiants structurés, homonymes Discogs, garde-fou Kosh/Koshi Inaba | Exhaustivité ou justesse de toutes les identités du catalogue mondial |
| Graphe et catalogues | Labels, remixes, crédits, compilations, alias, chaînes, territoires/périodes, curseurs, absence de preuve, chemins multi-sauts | Complétude des relations renseignées chez chaque fournisseur |
| Parcours | Continuer, retour au départ précédent, relance, mise de côté, reprise après rechargement, fermeture, réponses tardives et annulation d’attente | Conflits d’usage simultané dans plusieurs navigateurs personnels |
| Écoute et miniatures | Relais d’image et repli local côté serveur ; distinction fiche/recherche/vidéo dans le rendu | Lecture effective de chaque vidéo YouTube ou d’un achat externe |
| Carnet et sauvegarde | Conservation, recherche, classement, notes, export, retrait/annulation, restauration, rejet d’une sauvegarde invalide | Garantie de conservation après effacement manuel du profil navigateur ou du disque |
| Identifiants et secrets | ID OAuth local ; jeton Discogs enregistré, relu après redémarrage, supprimable, non renvoyé dans l’API ; export sans secrets | Nouvelle authentification personnelle Discogs/Google |
| Bandcamp | Validation d’URL et de métadonnées, import JSON et formulaire, provenance « fournie par l’utilisateur » | Scraping automatique ou vérification externe de chaque donnée saisie |
| Autres plateformes | Comparaison par ISRC/pays sur réponses de test ; état non configuré explicite | Connexions Spotify, Apple Music, SoundCloud et exclusivités réelles |
| Pannes | 401, 429/Retry-After, 503, cache périmé, file d’écriture après échec, annulation, réponses obsolètes | Toutes les pannes réseau et tous les comportements de chaque navigateur |

## Reproduction

```bash
npm run check
npm test
node --test --experimental-test-coverage
npm run audit:browser
```

Pour la couverture, le rejeu terminé utilise Node 24.19.0. L’essai instrumenté
sous Node 18 a été interrompu après attente anormale ; la suite normale sous
Node 18 passe. La couverture du processus de test n’inclut pas à elle seule le
serveur lancé en sous-processus ni les fonctions DOM exercées dans Chromium.

`audit:browser` nécessite Playwright et son navigateur. L’exécution de cet audit
a utilisé le runtime fourni et un Chromium de test placé dans `/tmp`, sans
installation globale ni modification du navigateur personnel :

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/scout-browser-runtime \
SCOUT_PLAYWRIGHT_MODULE=/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs \
/home/olivier/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/browser-audit.mjs
```

Le script affiche le dossier de ses captures et son `audit.json`.
Dernier rejeu validé : `/tmp/scout-ui-audit-rm6VFP` (36 scénarios).
Rapports unitaires : `/tmp/scout-014-node18-final.tap` et
`/tmp/scout-014-node24-final.tap`. Ces fichiers temporaires ne sont pas une
archive durable ; les commandes permettent de les reproduire.

## Limites restantes et décisions assumées

1. Une identité introuvable reste un blocage explicite avec accès aux sources.
   Aucune confirmation d’homonyme n’est faite à la place du digger.
2. L’import Bandcamp reste manuel. Un lien de recherche n’est pas un catalogue
   Bandcamp automatiquement intégré.
3. Un titre trouvé dans Discogs/MusicBrainz n’a pas forcément une écoute directe.
   L’interface indique quand il faut encore chercher ou confirmer la vidéo.
4. « Arrêter l’attente » interrompt l’attente du navigateur et invalide les
   résultats tardifs ; une requête déjà reçue par le serveur peut finir.
5. Le carnet et la bibliothèque dépendent du profil navigateur ; une copie du
   parcours et le graphe sont aussi conservés côté serveur. Exporter une
   sauvegarde reste nécessaire avant de supprimer un profil ou des fichiers.
6. Pas de validation exhaustive Firefox/Safari, lecteur d’écran ou WCAG.
   L’audit Chromium couvre les écrans desktop/mobile, le clavier du sélecteur
   et les scénarios listés, sans promettre zéro défaut futur.
7. `app.js` conserve du code historique. La nouvelle navigation est isolée dans
   `workspace.mjs`/`workspace.css` ; un découpage supplémentaire du contrôleur
   améliorerait la maintenance mais n’a pas été fait au prix d’une réécriture
   complète du moteur pendant cet audit.

## Préservation et périmètre

Les modifications antérieures du dépôt ont été conservées. Aucun reset Git,
commit, push ou déploiement public. Les tests n’effacent pas la bibliothèque,
les confirmations ou les secrets personnels. Seul le serveur Scout sur 4181
est redémarré pour charger le backend corrigé ; le projet MUBI sur 4180 est hors
périmètre. Les accès aux fournisseurs restent soumis à leur configuration,
leurs quotas et à une validation réelle distincte des fixtures.
