> **DOCUMENT HISTORIQUE** — les nombres de tests, statuts et étapes ci-dessous décrivent le moment de leur rédaction. Pour l’état courant, voir `README.md`.

# Livraison 0.13 — état réel des 30 chantiers

13 septembre 2026. Application locale uniquement ; aucune publication, aucun
nouveau compte ni abonnement. Les anciennes données ne sont pas effacées.

## Ce qui change dans le parcours

Choisir un départ → résoudre ou confirmer son identité → choisir les directions
→ lire leurs catalogues → écouter/chercher l’écoute → garder ou continuer →
reprendre ou revenir au départ précédent.

Les métadonnées de catalogue identifient les morceaux proposés. Une recherche
YouTube sert ensuite à trouver leur écoute ; elle ne constitue plus à elle
seule une preuve de proximité par label. Sans confirmation d’identité ou sans
source accessible, le résultat le dit et conserve le point de reprise.

## Les 30 points

| # | Chantier | Livraison et borne |
|---|---|---|
| 1 | Directions distinctes | Requêtes et résultats séparés pour label, remix, featuring, compilation, alias, chaîne, territoire et période. |
| 2 | Résolveur morceau | Les titres sans séparateur, dont les chaînes Topic, utilisent l’artiste connu comme candidat de requête ; identification définitive par données concordantes, pas par découpage seul. |
| 3 | Identités sûres | Identifiants exacts et liens croisés ; hypothèses historiques isolées ; confirmation explicite proposée à l’utilisateur. |
| 4 | Catalogues de labels | Pagination des sorties du label identifié puis lecture des éditions/tracklists. Les seuls morceaux de l’artiste source ne remplissent pas cette direction. |
| 5 | Crédits complets | Import des artistes et rôles des tracklists Discogs et des relations d’enregistrement MusicBrainz. Limite : crédits réellement renseignés par ces bases. |
| 6 | Écoute du morceau | Réutilisation des vidéos documentées ; sinon recherche d’écoute explicite et bouton de rapprochement titre/artiste/version. Pas de reconnaissance audio. |
| 7 | Groupes de résultats | Une section par direction, raccourcis de navigation, directions vides compactes et résultats non vides en premier. |
| 8 | Déduplication | ISRC/identifiant d’enregistrement privilégiés ; doublons textuels de présentation regroupés, versions/remixes distincts. Ce regroupement ne fusionne pas les identités du graphe. |
| 9 | Explications uniques | Chemin documenté dans un détail repliable ; sources répétées regroupées. Les anciennes explications génériques ne sont pas reconduites comme preuves. |
| 10 | Vraie relance | Les candidats déjà proposés sont consommés, y compris leurs uploads équivalents ; lecture des pages suivantes. Le front change aussi de chemin. |
| 11 | Diversité réglable | Deux orientations réelles : varier les artistes ou approfondir les catalogues ; jamais un score de goût affiché. |
| 12 | Épuisement honnête | Confirmation manquante, enrichissement, API indisponible, catalogue partiel et fin de la portée interrogée sont distincts. Pas de prétention à l’exhaustivité mondiale. |
| 13 | Import compréhensible | Compteurs entrées, identifiants uniques, doublons, indisponibles, hors sélection et absences. Plafond 5 000 vidéos uniques. |
| 14 | Import reprenable | Checkpoints par page et lots de détails dans IndexedDB ; reprise explicite et conservation de la bibliothèque si l’import est incomplet. |
| 15 | Départ unique | Choix de type, filtre local et amorces facultatives réunis ; aucun faux champ de requête sémantique/LLM. |
| 16 | Interface compacte | En-tête réduit, sources repliables, pistes sans miniatures géantes artificielles, actions secondaires regroupées et adaptation mobile. |
| 17 | Actions hiérarchisées | Écouter/chercher l’écoute, garder, continuer ; exploration et mise de côté restent dans les actions secondaires du front. |
| 18 | Retour dans le parcours | Instantanés des douze départs précédents : front, sélection de catalogue, dossier et collaborateurs. Les réponses tardives ne réinstallent plus l’ancien départ. |
| 19 | Bandcamp | Import local de métadonnées JSON sourcées, sorties et morceaux ; provenance « fournie par vous ». **Partiel : pas de collecte automatique du catalogue Bandcamp.** |
| 20 | Compilations | Traversée des sorties typées compilation et des morceaux/artistes qui y sont réellement crédités. Une sortie partagée ne suffit pas à inventer un featuring. |
| 21 | Alias/projets | Relations d’alias et appartenance à des groupes issues des fiches exactes ; pas de déduction sur des noms ressemblants. |
| 22 | Collaborations | Décompte des morceaux distincts, échantillons de provenance, partenaires directs et deuxième degré. Dépend des crédits présents, pas d’une similarité esthétique. |
| 23 | Chaînes-curatrices | Canal séparé des artistes ; les chaînes sont des provenances éditoriales. Les identifiants YouTube exacts permettent de parcourir leurs publications quand YouTube est connecté. |
| 24 | Dates | Date de sortie/originale, réédition et date de publication YouTube séparées. Une date d’upload ne définit plus l’époque musicale. |
| 25 | Plateformes | Comparaison par ISRC et territoire, présence observée/non trouvée/non configurée. **Activation Spotify/Apple Music conditionnée à leurs accès API ; aucune exclusivité globale déduite.** |
| 26 | Sorties annoncées | Dates futures explicitement marquées comme annonces ; pas de morceau présenté comme déjà paru parce qu’une annonce est indexée. Couverture limitée aux sources interrogées. |
| 27 | Scènes/époques | Relations documentées et dates musicales uniquement. Un pays reste un territoire, pas une scène supposée. **Couverture partielle du graphe, pas de scène inférée depuis le son.** |
| 28 | Carnet | Classement à écouter/à creuser/gardée, notes, sources et départ conservés. Garder à nouveau une piste ouvre le carnet sans supprimer les notes. |
| 29 | Sauvegarde | Export/import de bibliothèque, carnet, corrections, identités, graphe et parcours. Validation puis transaction/retour arrière local ; copie graphe serveur additive. Secrets exclus. |
| 30 | Vérification utile | Cas négatifs du moteur, pagination, panne de source, homonymes, restauration, tests de courses asynchrones et contrôle navigateur. Les tests à données contrôlées ne certifient pas la disponibilité continue des API. |

## Limites à ne pas masquer

- Bandcamp n’est pas un catalogue aspiré automatiquement. Un import fourni
  par l’utilisateur n’est pas une vérification indépendante par le site.
- Spotify, Apple Music et les autres plateformes ne deviennent pas disponibles
  parce qu’un bouton existe. Les accès manquants sont affichés.
- YouTube requiert la connexion ou une clé pour importer et rapprocher les
  vidéos. Les tokens OAuth ne passent pas au serveur de catalogue.
- MusicBrainz/Discogs peuvent manquer de crédits ou répondre lentement. Les
  pages restantes sont conservées ; l’app n’invente pas une impasse musicale.
- Une correspondance de métadonnées vidéo n’est pas une empreinte audio.
- Le travail est une version fonctionnelle bornée de ces 30 axes, pas trente
  garanties d’exhaustivité des données de toutes les plateformes.

## Vérification et activation

Commandes locales : `npm run check`, `npm test`, `git diff --check`.
Le serveur doit annoncer `0.13.0` dans `/api/status`, comme le client.
Les tests HTTP démarrent des serveurs et catalogues temporaires isolés.
Les contrôles navigateur utilisent aussi le parcours existant pour observer
la migration ; ils ne remplacent pas la bibliothèque du navigateur personnel.

Résultats observés le 13 septembre 2026 :

- `npm run check` et `git diff --check` : code de sortie 0.
- `npm test` : **105 tests réussis sur 105**, aucun ignoré ou annulé.
- Serveur local `4181` redémarré et observé en **0.13.0**, interface alignée.
- Contrôle navigateur sur un catalogue fictif isolé (`4182`, données sous
  `/tmp`) : six morceaux de six artistes, relance sans reprendre ces six
  morceaux, continuation depuis une carte, retour au départ précédent,
  rechargement conservant la sélection et la note du carnet. Aucune erreur
  JavaScript relevée dans cette séquence. Ce contrôle n'utilise pas les
  playlists ni les identifiants personnels.
- Parcours historique observé sur `4181` : l'association vidéo/artiste encore
  hypothétique demande maintenant confirmation ou propose d'explorer la fiche
  artiste séparément. Aucune confirmation n'a été donnée à la place du digger.
- Contrôle réel du catalogue depuis l'identifiant MusicBrainz exact d'Art of
  Tones : **Fresh Meat → Giovanni Damico → Get in the Spirit / Fanu Bob /
  Dirty Disc**, trois morceaux obtenus en trois appels à MusicBrainz après
  priorité donnée au label et à ses éditions. Les liens d'écoute sont encore
  des recherches YouTube explicitement nommées ; aucune vidéo exacte n'est
  déclarée vérifiée par ce contrôle. Quatorze tâches restaient dans le curseur.
- Spotify/Apple Music avec de vrais accès, import réel de 5 000 vidéos et
  restauration du profil personnel Firefox : **non exécutés dans cette
  validation**. Leurs contrats locaux sont testés, pas leur disponibilité
  ni leurs données réelles.

Références techniques consultées :
[MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API),
[crédits Discogs](https://support.discogs.com/hc/en-us/articles/360005006834-Database-Guidelines-10-Credits),
[Bandcamp API](https://bandcamp.com/developer).
