# MUBI Film Scout

MUBI Film Scout est un programmateur personnel de soirée et un explorateur
local du catalogue signalé pour MUBI France.
Il transforme une envie en quatre propositions qui assument des fonctions
différentes : le choix juste, le pas de côté, le pari et le contre-choix.

Application locale pour obtenir une sélection de films réellement disponibles
avec l’abonnement **MUBI en France**, sans automatiser ni extraire le site
JustWatch.

Le Scout utilise l’API officielle de TMDB. Les données de disponibilité de
TMDB sont fournies par JustWatch ; l’application vérifie individuellement les
films du programme dans la région française. Le catalogue, lui, distingue les
titres simplement signalés des fiches vérifiées. Les critiques Guardian, NYT
et OMDb arrivent séparément, après les films.

## Version 0.16.3 — récupération et consolidation

La version **0.16.3** récupère la livraison 0.16.2 conservée dans une sauvegarde
Git et la fusionne avec les protections d’import, le lancement contrôlé et
l’export texte récents. Voir [RECUPERATION-0.16.3.md](./RECUPERATION-0.16.3.md)
pour les vérifications du 22 septembre et les limites restantes.
La [consolidation 0.16.1](./CONSOLIDATION-0.16.1.md) décrit les choix de classement.

Le détail des fonctions, de leurs limites et des vérifications se trouve dans
[LIVRAISON-0.16.md](./LIVRAISON-0.16.md).

- Accès direct au catalogue ; affichage progressif ; fiches latérales.
- Verrouiller/remplacer un film, exclure pour ce soir, élargissements chiffrés.
- Bibliothèque sans plafond applicatif, listes, avis et profil explicites.
- Collections importables et petit corpus éditorial sourcé de cinq films.
- Rapprochements par axe, choix à deux, doubles séances, parcours de trois films.
- Décodage validable du texte ; adaptateur LLM local facultatif.

Les contrôles avancés de l’atelier sont repliés par défaut. Aucun nouvel accès
API n’est nécessaire. Le moteur fonctionne sans modèle de langage.

## Lancer

Prérequis : Node.js 18 ou supérieur et un jeton de lecture TMDB.

Depuis la racine de votre copie du dépôt Corpus, le lancement le plus simple
ouvre le navigateur et démarre le serveur s’il ne tourne pas déjà :

```bash
cd projets/mubi-film-scout
./launch.sh
```

Une fois dans ce dossier, le même lancement est disponible avec `npm run launch`.
Le lanceur vérifie l'identité du service déjà présent sur le port. S'il signale
un service non identifié, vérifiez ce qui occupe ce port avant de le relancer,
ou choisissez un autre `PORT`. Une ancienne instance MUBI démarrée avant l'ajout
de cette identification doit être arrêtée puis redémarrée pour être reconnue.
Pour un démarrage au premier plan, toujours depuis ce dossier :

```bash
npm start
```

Ouvrir ensuite <http://127.0.0.1:4180>. Le **Centre des sources** permet de
coller une seule fois les accès TMDB, Guardian, New York Times et OMDb.
Ils sont conservés **en clair** sur cette machine dans `.sources.local.json`,
avec des droits de lecture limités au compte utilisateur (`0600`) et une
exclusion Git. Ce coffre local n’est donc pas un chiffrement. Le navigateur ne
reçoit ensuite que leur état (« enregistré » ou non), jamais leur valeur.

TMDB est le seul accès nécessaire au fonctionnement. Les trois autres sources
sont réellement interrogées pour les quatre films finaux : critiques et
étoiles du Guardian, critiques retrouvées par Article Search au New York Times,
puis notes agrégées et distinctions via OMDb. Un rapprochement Guardian ou NYT
n’est affiché que si le titre, le contexte de critique cinéma et l’époque (ou
le réalisateur) sont compatibles. L’interface expose la nature du
rapprochement ; une absence sûre vaut mieux qu’un avis attribué au mauvais
film.

Ces regards extérieurs documentent les propositions mais ne sont pas fusionnés
en score global et ne réordonnent pas silencieusement la sélection TMDB. Les
résultats indiquent, pour chaque source, le nombre de rapprochements sûrs.

Trakt n’est pas demandé : la création d’une nouvelle application API est
actuellement réservée aux comptes VIP, sans bénéfice indispensable pour le
Scout.

Les variables d’environnement restent possibles et sont prioritaires sur le
coffre local :

```bash
TMDB_READ_TOKEN="votre-jeton" \
GUARDIAN_API_KEY="votre-cle" \
NYT_API_KEY="votre-cle" \
OMDB_API_KEY="votre-cle" \
npm start
```

Le jeton de lecture se crée dans les paramètres du compte TMDB, rubrique API.

## Utilisation

- choisir explicitement l’effet recherché, le temps disponible et la liberté
  accordée au programmateur ;
- ajouter, si nécessaire, une précision courte comme `science-fiction après
  2010` : ce champ n’est pas un dialogue avec un LLM et son vocabulaire reconnu
  est annoncé dans l’interface ;
- déplier les critères pour choisir une période, des genres et jusqu’à deux
  angles de découverte ;
- marquer un film comme déjà vu pour ne plus le revoir dans les sélections ;
- garder des films sans plafond applicatif, en comparer jusqu’à quatre, ou écarter localement
  une proposition ;
- dans « À garder », télécharger une liste texte des titres, années et durées,
  consultable hors application, sans films vus, évaluations ni réglages ;
- exporter et réimporter les choix locaux au format JSON ;
- utiliser « Surprends-moi » pour tirer une sélection ailleurs que sur la
  première page des résultats.

L’import JSON accepte les exports `mubi-film-scout-local-v1` jusqu’à 2 Mio (2 097 152 octets).
Les listes, identifiants, films gardés, évaluations et réglages sont contrôlés
avant remplacement. Les doublons sont retirés et les films à comparer doivent
figurer parmi les films gardés ; les limites restent de quatre comparés et
cent évaluations récentes, sans plafond applicatif de films gardés.
Le profil, les collections et l’historique de l’atelier sont conservés après
validation et nettoyage des champs. Un fichier invalide ou une erreur
de stockage conserve les choix actuels. Si vous modifiez vos choix pendant la
lecture, l’import est refusé et peut être relancé ; un nouvel import remplace
une lecture encore en attente. L’action d’oubli annule aussi les imports en cours.

Le Centre des sources contient aussi un diagnostic explicite du serveur, des
quatre connexions, du dernier test réseau et de la dernière recherche réussie.
Le bouton de test contacte uniquement les sources configurées lorsqu’il est
actionné. En terminal :

```bash
npm run doctor
npm run doctor:live
```

La seconde commande effectue un appel réel à chaque source configurée.

## Réglages différentiels

Les lentilles ne correspondent pas à des colonnes TMDB. Le Scout explore
environ 100 titres en mode fidèle, 160 avec un pas de côté et jusqu’à 240 en
mode aventureux. Il présélectionne ensuite 24 à 32 candidats à enrichir avant
de composer quatre propositions. Les lentilles diversifient cet ensemble à
partir de plusieurs signaux, sans afficher de score global :

- **Pépite cachée** : forte réception, faible visibilité ;
- **Dépaysement** : langues originales moins familières ;
- **Mémoire vive** : films anciens qui tiennent encore ;
- **Film oblique** : genres rares et marqueurs formels atypiques.

Deux lentilles au maximum peuvent être cochées ensemble. Les trois anciennes
lentilles « Court et dense », « Accident heureux » et « Grand écart » ont été
retirées de l’interface : leurs fonctions sont déjà assumées, respectivement,
par le temps disponible, le bouton « Surprends-moi » et le niveau de détour.
« Sélection oblique » active désormais le seul angle Film oblique et la liberté
maximale, sans couplage caché.

Le niveau de détour change la composition elle-même : fidèle conserve les
quatre meilleures réponses du même couloir, le pas de côté équilibre proximité
et contraste, et le mode aventureux cherche trois propositions plus profondes
et éloignées. Les rôles affichés sur les quatre cartes changent en conséquence.
Les choix du formulaire sont mémorisés localement pour la visite suivante.

Après chaque recherche, trois vues sont disponibles : le programme éditorial
de quatre films, « Tous les titres explorés » et la sélection « À garder ».
Le catalogue peut charger les pages TMDB suivantes à la demande, puis être
filtré par titre, langue ou vérification et trié localement. Ce chargement ne
lance pas d’appels Guardian, NYT ou OMDb. Les films contrôlés individuellement
auprès de TMDB portent un badge « Vérifié » ; les autres sont des titres
signalés MUBI France par le filtre TMDB/JustWatch. La date de consultation et le
nombre de pages chargées restent visibles : le Scout ne présente pas ce flux
tiers comme un inventaire certifié de MUBI.

Chaque programme passe aussi cinq invariants explicites (nombre, unicité,
durée, films vus et disponibilité), sans score global. Le bouton « Oui, elle
aide / À revoir » constitue le banc d’observation réel : les réponses restent
locales, peuvent être exportées et servir à comparer ultérieurement deux
versions du moteur. Vingt envies de référence testent séparément le vocabulaire
du champ libre, y compris un cas volontairement non reconnu (`polar`).

L’interface affiche toujours les contraintes effectivement appliquées. Les
préférences qualitatives reconnues (par exemple « effets spéciaux »,
« contemplatif » ou « poétique ») sont signalées par `≈` : elles réordonnent les
résultats à partir des genres, mots-clés, popularité et budget connus par TMDB,
mais ne constituent pas une garantie absolue.

Les réglages et films vus restent uniquement dans le stockage local du
navigateur. Le bouton du pied de page efface aussi l’accès temporaire de
l’onglet. L’effacement du coffre persistant se fait séparément dans le Centre
des sources, après confirmation.

## Vérifier

```bash
npm test
npm run check
```

Les tests n’appellent aucun service externe. Ils parcourent notamment les 594
combinaisons jouables des intentions, durées, détours et lentilles, les vingt
envies de référence, les faux rapprochements de titres et la pagination légère
du catalogue. Une recherche réelle nécessite un
jeton TMDB et une connexion réseau. Le client Guardian gratuit est limité à un
appel par seconde : le serveur sérialise donc ses recherches et met les réponses
en cache. La disponibilité et le catalogue expirent après 15 minutes sur disque
(le petit cache mémoire TMDB expire après 5 minutes), les critiques après sept
jours, les absences de critique après un jour. Les erreurs ne sont pas mises
en cache comme des absences. Les dates de relevé ne sont pas réécrites lors
d’une lecture de cache. Le fichier local `.runtime/catalogue-cache.json`
est ignoré par Git, avec droits `0600` et clés de cache hachées.

Le nouveau banc couvre en plus **792 combinaisons** (dont la durée sans limite) :

```bash
npm run benchmark
```

Il s’agit d’un catalogue synthétique fixe : ses résultats prouvent des
différences de comportement, pas une qualité de recommandation dans la vie réelle.

## Modèle de langage local facultatif

L’adaptateur accepte un serveur local exposant un endpoint de type
`chat/completions` (requête `model`, `messages`, `temperature` ; réponse
`choices[0].message.content` contenant un objet JSON). Il ne télécharge aucun
modèle, ne souscrit aucun service et n’envoie rien à un hébergeur distant.

Configurer **un serveur déjà installé** avant de lancer le Scout :

```bash
SCOUT_LLM_URL=http://127.0.0.1:1234/v1/chat/completions \
SCOUT_LLM_MODEL=nom-du-modele-local \
npm start
```

Ces valeurs sont un exemple de configuration, pas la preuve qu’un modèle existe
sur votre machine. Sans elles, le bouton LLM est désactivé. Les résultats du
modèle passent par une liste de champs autorisés et la normalisation du moteur,
puis sont présentés comme un brouillon à appliquer explicitement. Le modèle ne
décide ni d’une disponibilité, ni d’une note, ni d’un fait sur un film. Son
adaptateur est testé avec un serveur simulé ; aucune inférence réelle n’est
revendiquée sans modèle configuré.

## Sources et attribution

This product uses TMDB and the TMDB APIs but is not endorsed, certified, or
otherwise approved by TMDB.

Données et images : TMDB. Disponibilités : JustWatch. Critiques : The Guardian
et The New York Times. Réception agrégée : OMDb. MUBI Film Scout est un outil
personnel indépendant, sans affiliation ni approbation de ces services. Il
n’automatise et n’extrait ni MUBI ni JustWatch.
