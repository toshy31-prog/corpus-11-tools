# Audit du chantier — YouTube Scout 0.11.0

Date : 11 septembre 2026

## Conclusion opérationnelle

Le prototype est devenu un outil local de digging à sept capacités distinctes :

1. synchroniser jusqu’à 5 000 vidéos sans redemander tous les détails à chaque passage ;
2. composer des sessions et pistes dérivées réellement variables, avec mémoire d’exposition et diversité de chemins ;
3. résoudre prudemment une vidéo vers un artiste et un recording en corroborant séparément MusicBrainz, Discogs et le profil Bandcamp ;
4. ouvrir un dossier sourcé et transformer les voisins ListenBrainz en vidéos YouTube candidates ;
5. conserver un graphe artiste ↔ crédit ↔ label ↔ sortie, des affirmations et des événements entre redémarrages ;
6. comparer Apple Music, Spotify et la vidéo YouTube par ISRC et territoire sans inventer d’exclusivité.
7. parcourir le graphe par branches multi-sauts depuis une graine choisie, mémoriser le front et rendre l’épuisement explicite.

Le changement d’objet est effectif : les quatre cartes ne sont plus le résultat
final, mais des amorces possibles. Le front de fouille interroge les relations
locales avant toute nouvelle recherche textuelle et raconte chaque passage sous
forme de chaîne sourcée. MusicBrainz et Discogs produisent effectivement les
nœuds artiste, recording, sortie, édition, label, crédit et époque utilisés par
ces traversées.

Ce résultat n’est pas encore un agrégateur exhaustif de toutes les plateformes. Il n’existe pas d’API publique générale de recherche Bandcamp adaptée, MusicBrainz peut être temporairement indisponible, et Apple Music, Spotify, SoundCloud ou Discogs exigent des autorisations propres. L’interface l’annonce au lieu de simuler une couverture.

## Nœuds dénoués

- **Serveur obsolète invisible** : l’interface affiche maintenant la version client/serveur et signale un redémarrage nécessaire.
- **Import intégral à chaque fois** : réutilisation des métadonnées fraîches, rafraîchissement des nouveautés et des entrées âgées de plus de 30 jours, bilan de diff.
- **Cache mémoire perdu au redémarrage** : stockage JSON atomique en `.data/`, exclu de Git.
- **429 et pannes de catalogue** : file série par source, cadence, `Retry-After`, reprise exponentielle, cache périmé explicitement signalé.
- **Identité réduite à un nom** : registre d’affirmations séparées et conflits conservés.
- **Résolution trop fragile** : plusieurs parses traçables, alias et identifiants croisés, titre/artiste/version/durée.
- **Discogs superficiel** : artistes, apparitions, masters, releases, labels, catalogues, formats, tracklists et rôles.
- **Recommandations textuelles pauvres** : voisinage de recordings ListenBrainz, résolution prudente vers YouTube et chemin de preuve visible sur chaque piste.
- **Bandcamp essentiel mais techniquement contraint** : profil direct Wikidata ou lien confirmé par le digger, jamais scraping présenté comme fiable.
- **Reroll amnésique** : exposition et retours qualitatifs persistants, changement d’ordre de recherche, pénalités de répétition artiste/chaîne/chemin ; carnet exportable.
- **Fausse exclusivité** : comparaison territoriale par ISRC ; l’interface conserve explicitement le verdict « exclusivité non établie ».

## Statut de changement

- **Écrit** : version 0.11.0 dans le projet local.
- **Testé automatiquement** : 48 tests passent, couvrant notamment la traversée multi-sauts, l’épuisement, la reprise persistante, le résolveur corroboré, le graphe et le différentiel de plateformes ; syntaxe serveur, client et modules vérifiée.
- **Réobservé en réseau** : l’endpoint ListenBrainz réel a rendu 50 voisins structurés pour un recording de contrôle ; le cache et l’événement persistent dans le serveur d’audit isolé.
- **Réobservé dans le navigateur** : interface 0.11.0 chargée sous HTTP, version client/serveur alignée, un front réel ouvert depuis « Bams - Fais tourner 1998 », deux branches actives et cinq épuisées affichées sans faux résultat.
- **Continuité réobservée** : la branche compilation a changé de cible, puis la traversée vers cette cible a créé une lignée ; après rechargement, la même graine active et la même lignée ont été restaurées.
- **Activé sur le port utilisateur 4181** : le processus 0.10.0 a été remplacé par 0.11.0 ; le magasin existant et le jeton Discogs local ont été conservés (105 entités, 92 liens et 152 affirmations avant nouvelle résolution).

## Pistes encore substantielles

1. ajouter un corpus vérité de 100 vidéos difficiles, corrigées manuellement ;
2. mesurer séparément identité, recording, édition et pertinence de branche ;
3. résoudre les voisins ListenBrainz par ISRC/MBID lorsque les APIs exposent ces identifiants, la recherche YouTube textuelle restant actuellement vérifiée par artiste et titre ;
4. ajouter les crédits Discogs détaillés au réseau automatiquement après lecture d’une édition ;
5. activer Apple Music/Spotify par ISRC seulement si leurs jetons et conditions sont acceptables ;
6. construire un adaptateur SoundCloud OAuth distinct, sans faire dépendre le cœur de ce service ;
7. ajouter export/import du graphe et sauvegarde chiffrée facultative ;
8. exécuter une observation réelle après redémarrage avec les playlists et le jeton Discogs de l’utilisateur.

## Condition de révision

Si le corpus vérité montre que la résolution exacte unique est trop rare, il faudra améliorer les sources d’identifiants ou ajouter une confirmation guidée ; il ne faudra pas simplement abaisser les seuils et fusionner davantage d’homonymes.
