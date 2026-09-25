# Audit global du workflow — YouTube Scout 0.7.0

Date : 10 septembre 2026  
Objet : vérifier si l’outil aide réellement un digger à passer d’une archive personnelle à une découverte exploitable.

## Conclusion

La version 0.6 avait accumulé des capacités utiles autour d’un parcours resté hérité d’un programmateur de quatre vidéos. Elle savait montrer beaucoup de données, mais elle ne formait pas encore une boucle de digging : choisir un axe, ouvrir une piste, comparer, conserver, revenir et bifurquer.

La version 0.7 corrige le premier niveau de ce défaut. Le parcours devient :

1. connecter ou retrouver les sources ;
2. choisir une mission de fouille ou formuler une envie ;
3. examiner quatre éclaireurs sans perdre le vivier classé ;
4. déclencher explicitement l’enquête d’un artiste ;
5. comparer identité, éditions Discogs, sorties MusicBrainz, contexte Wikidata et vidéos YouTube ;
6. conserver une piste dans le carnet ;
7. revenir, exporter ou relancer.

Cela ne suffit pas encore à produire un moteur multi-plateformes. Le morceau exact et l’édition exacte restent les pivots manquants.

## Échecs observés dans la version 0.6

### 1. Le formulaire précédait l’intention

L’utilisateur devait comprendre simultanément OAuth, playlists, phrase libre, durée, température et sept lentilles. Le placeholder parlait encore d’architecture, trace directe de l’outil généraliste dont YouTube Scout avait été dérivé.

**Effet :** le dispositif demandait au digger de concevoir lui-même l’algorithme avant d’obtenir une première piste.

**Correction inscrite :** quatre missions musicales règlent phrase, durée, écart et lentilles. La phrase libre reste disponible et modifiable.

### 2. La configuration occupait durablement le centre

Même après l’import, la connexion et les champs de clé restaient le premier grand bloc de la page.

**Effet :** l’infrastructure restait plus visible que la collection.

**Correction inscrite :** la source se replie quand une bibliothèque locale existe. Le client OAuth est mémorisé localement ; le jeton et la clé API ne le sont pas durablement.

### 3. Quatre résultats devenaient une clôture

Le moteur classait toute la bibliothèque mais n’en montrait que quatre éléments. Accéder aux suivants exigeait un reroll qui effaçait le contexte précédent.

**Effet :** la variation simulait l’exploration sans permettre de comparer le bassin de candidats.

**Correction inscrite :** les quatre cartes deviennent des éclaireurs. Jusqu’à douze autres candidats restent visibles dans un vivier classé.

### 4. Il n’existait pas de mémoire de travail

« Déjà vue » servait à exclure et « Épingler » ne survivait pas à la session. Aucun geste ne signifiait « ceci mérite une écoute ou un recoupement ultérieur ».

**Correction inscrite :** carnet de fouille local, persistant, alimenté depuis les quatre cartes, le vivier ou les pistes dérivées, avec export JSON.

### 5. Le Scout dépensait des appels sans décision du digger

Chaque artiste détecté avec une confiance élevée lançait automatiquement son enquête, dont une recherche `search.list` YouTube. Quatre cartes pouvaient donc déclencher quatre recherches à chaque composition.

La documentation YouTube actuelle attribue un compartiment quotidien par défaut de 100 appels `search.list`. Une exploration automatique de quatre cartes pouvait consommer ce compartiment après environ 25 compositions, sans compter les labels et collaborateurs.

**Correction inscrite :** aucune enquête externe n’est lancée sans clic sur « Explorer l’artiste ».

### 6. Les recommandations dérivées confondaient crédit et sujet

Une mention d’artiste dans la description suffisait. Des vidéos génériques utilisant une piste en fond sonore remontaient donc comme sorties de l’artiste.

**Correction inscrite :** pour un artiste, tous les termes doivent être présents dans le titre ou le nom de chaîne. Les résultats sont ensuite enrichis par `videos.list`, les formats très courts/Shorts sont écartés et l’ordre privilégie la présence dans le titre puis la récence.

### 7. L’identité bloquait derrière la discographie

L’endpoint canonique réutilisait une fonction MusicBrainz qui chargeait aussi les groupes de sorties. En situation réelle, Dot Allison a demandé environ 24 secondes et MusicBrainz a fini indisponible, alors que Wikidata et Discogs avaient déjà convergé.

**Correction inscrite :** la résolution MusicBrainz d’identité est séparée de la discographie, limitée à une recherche et bornée à 6,5 secondes. Les trois sources courent en parallèle. Une fiche partielle n’est mise en cache que cinq minutes ; une fiche complète l’est 24 heures.

### 8. Discogs n’était qu’un identifiant

Le jeton permettait de reconnaître un artiste mais le Scout n’utilisait ni ses éditions ni ses apparitions.

**Correction inscrite :** lecture de `/artists/{id}` et `/artists/{id}/releases`, puis affichage des vingt résultats les plus récents avec rôle, année, label, format et lien release/master.

## Sources : potentiel réel et ordre recommandé

### Niveau 1 — colonne vertébrale ouverte

- **MusicBrainz** : artistes, recordings, releases, release groups, labels, ISRC et relations. C’est la meilleure charnière ouverte pour résoudre le morceau exact et typer les crédits.
- **Wikidata** : ponts d’identifiants, alias, contexte et certains liens Bandcamp. Utile pour relier ; insuffisant seul pour une discographie.
- **Discogs** : éditions, masters, labels, formats, numéros de catalogue, rôles et apparitions. Désormais partiellement branché.
- **ListenBrainz** : recommandations par recording MBID et signaux d’écoute. Très intéressant une fois les vidéos résolues en recordings ; la recommandation collaborative est annoncée comme expérimentale et l’API impose une cadence respectueuse.

### Niveau 2 — disponibilité commerciale

- **Apple Music** : recherche du catalogue, artistes, albums, morceaux, dates et storefronts ; exige un jeton développeur.
- **Spotify** : recherche catalogue possible, mais les restrictions du mode développement ont changé en février 2026 : compte Premium du propriétaire, cinq utilisateurs par application, disparition en mode développement de `new-releases` et `top-tracks`, limite de recherche réduite. Spotify ne doit donc pas devenir la colonne vertébrale.
- **SoundCloud** : catalogue et recherche utiles pour les exclusivités, mais l’accès API demande désormais une application enregistrée, OAuth 2.1 et, d’après la documentation actuelle, un compte Artist Pro.

### Niveau 3 — terrains essentiels mais sans API de catalogue publique adaptée

- **Bandcamp** : indispensable au digging, mais l’API officielle documentée vise les comptes de labels et la vente/merchandise, pas une recherche publique générale du catalogue. Le lien direct vérifié reste sûr ; un scraper serait fragile, coûteux à maintenir et à examiner au regard des conditions du site.
- **Beatport, Bleep, Boomkat, NTS, Mixcloud, WhoSampled** : conserver comme portes spécialisées tant qu’un adaptateur légal, stable et testable n’est pas établi.

## Architecture cible

La prochaine architecture ne doit pas être « une API par carte », mais un graphe d’assertions :

```text
vidéo YouTube
  → candidat artiste + titre + mix
  → recording MusicBrainz / ISRC
  → release group
  → éditions Discogs
  → offres par plateforme et territoire
  → crédits artiste / remixeur / producteur / label
  → nouvelles pistes avec chemin de provenance
```

Chaque arête doit conserver : source, identifiant, date d’observation, type de relation et état `confirmé / candidat / contradictoire / indisponible`.

## Prochains lots

1. **Résolveur de morceau** : parser `artiste – titre (mix)`, chercher les recordings MusicBrainz et conserver plusieurs candidats plutôt que choisir silencieusement.
2. **Pont MusicBrainz–Discogs** : release group, release, master, ISRC, catalogue et pays.
3. **Tableau comparatif d’un morceau** : YouTube, Bandcamp, Discogs, Spotify, Apple Music et SoundCloud, avec disponibilité observée et date.
4. **ListenBrainz** : recommandations par recording MBID pour sortir du simple voisinage textuel.
5. **Réseau structuré de crédits** : relations MusicBrainz et rôles Discogs avant le compteur textuel issu des titres YouTube.
6. **Évaluation sur bibliothèque réelle** : vingt enquêtes tirées de plusieurs playlists, mesure du taux de bonne identité, du taux de pistes réellement liées, du délai jusqu’à une piste gardée et du coût API.

## Statut de validation

- Patch 0.7 inscrit localement.
- 19 tests unitaires et d’intégration réussis.
- Syntaxe serveur/client vérifiée.
- Interface vide chargée sous HTTP sans erreur console.
- Discogs riche testé avec serveur factice.
- La version 0.7 complète doit être redémarrée avec le jeton Discogs pour être active sur le port 4181.
- Le workflow avec la bibliothèque réelle, la précision des recommandations et les temps de réponse après redémarrage ne sont pas encore réobservés.
