# Audit ciblé — import, réglages, UX et résolveurs

Date : 10 septembre 2026  
Version : 0.8.0

## Conclusion

Le formulaire prétendait comprendre une phrase libre et exposait plusieurs
lentilles proches sans rendre leur différence vérifiable. Ces deux éléments ont
été retirés. L’utilisateur choisit désormais un geste de fouille explicite et
ne règle que deux contraintes qui filtrent réellement les données.

## Changements inscrits

- Plafond porté de 1 200 à 5 000 vidéos uniques.
- Lecture circulaire des playlists pour éviter qu’une grande liste absorbe le
  plafond avant les autres.
- Enrichissement YouTube en quatre lots concurrents avec reprise bornée sur
  timeout, erreur réseau, HTTP 429 ou erreur serveur.
- Compteur avant import : playlists sélectionnées, entrées annoncées et plafond.
- Suppression de la phrase libre, du curseur d’écart et de la matrice de
  lentilles.
- Quatre modes exclusifs, décrits par leur effet réel et testés sur un même jeu
  de vidéos : récent, réseau, archive et décentrement.
- Résolveur artiste renforcé par alias et identifiants structurés
  Wikidata/MusicBrainz/Discogs, sans score global ni fusion d’homonymes.
- Résolveur de morceau ajouté : parse artiste/titre/version, recordings
  MusicBrainz, éditions Discogs candidates et liens de vérification Bandcamp.

## Frontières maintenues

- 5 000 est un plafond, pas la promesse de lire une vidéo privée, supprimée ou
  inaccessible à l’identité Google connectée.
- Une recherche Discogs de release n’établit pas à elle seule que l’édition
  contient le morceau : elle reste candidate.
- Bandcamp ne fournit pas ici de résultat ingéré : le lien ouvre une recherche
  externe à vérifier.
- Le résolveur n’utilise pas d’empreinte audio. Un titre ambigu reste ambigu.

## Validation locale

- Tests unitaires : parseur, résolution stricte, alias, identifiants croisés,
  réseau de crédits et différenciation des quatre modes.
- Tests d’intégration : interface sans faux champ libre, plafond 5 000,
  endpoint recording et séparation des résultats Discogs.
- Contrôle syntaxique de tous les modules serveur et navigateur.
