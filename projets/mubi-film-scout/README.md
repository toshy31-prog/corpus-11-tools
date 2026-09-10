# MUBI Film Scout

MUBI Film Scout est un programmateur personnel de soirée, pas un catalogue bis.
Il transforme une envie en quatre propositions qui assument des fonctions
différentes : le choix juste, le pas de côté, le pari et le contre-choix.

Application locale pour obtenir une sélection de films réellement disponibles
avec l’abonnement **MUBI en France**, sans automatiser ni extraire le site
JustWatch.

Le Scout utilise l’API officielle de TMDB. Les données de disponibilité de
TMDB sont fournies par JustWatch ; l’application vérifie chaque résultat dans
la région française avant de l’afficher. Les quatre propositions finales sont
ensuite enrichies par The Guardian, le New York Times et OMDb lorsque leurs
clés sont configurées.

## Lancer

Prérequis : Node.js 18 ou supérieur et un jeton de lecture TMDB.

Le lancement le plus simple ouvre le navigateur et démarre le serveur s’il ne
tourne pas déjà :

```bash
./launch.sh
```

Le même lancement est disponible avec `npm run launch`. Pour un démarrage au
premier plan :

```bash
cd /home/olivier/Documents/ChatGPT/Corpus/projets/mubi-film-scout
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
puis notes agrégées et distinctions via OMDb. Un rapprochement n’est affiché
que si le titre correspond suffisamment ; une absence sûre vaut mieux qu’un
avis attribué au mauvais film.

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
- utiliser « Surprends-moi » pour tirer une sélection ailleurs que sur la
  première page des résultats.

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

Après chaque recherche, deux vues sont disponibles : le programme éditorial de
quatre films, enrichi par les sources extérieures, et « Tous les titres
explorés ». Cette seconde vue affiche progressivement l’ensemble des résultats
remontés pendant l’exploration, avec un filtre local par titre. Elle ne lance
pas d’appels Guardian, NYT ou OMDb supplémentaires. Les films contrôlés
individuellement auprès de TMDB portent un badge « Vérifié » ; les autres sont
des titres signalés MUBI France par le filtre TMDB/JustWatch.

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
combinaisons jouables des intentions, durées, détours et lentilles. Une recherche réelle nécessite un
jeton TMDB et une connexion réseau. Le client Guardian gratuit est limité à un
appel par seconde : le serveur sérialise donc ses recherches et met les réponses
en cache pendant la session.

## Sources et attribution

This product uses TMDB and the TMDB APIs but is not endorsed, certified, or
otherwise approved by TMDB.

Données et images : TMDB. Disponibilités : JustWatch. Critiques : The Guardian
et The New York Times. Réception agrégée : OMDb. MUBI Film Scout est un outil
personnel indépendant, sans affiliation ni approbation de ces services. Il
n’automatise et n’extrait ni MUBI ni JustWatch.
