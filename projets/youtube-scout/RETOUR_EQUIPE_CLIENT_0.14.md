> **DOCUMENT HISTORIQUE** — les nombres de tests, statuts et étapes ci-dessous décrivent le moment de leur rédaction. Pour l’état courant, voir `README.md`.

# YouTube Scout 0.14 — retour de validation

## Statut

La version 0.14 est fonctionnelle localement et passe la suite de validation
automatisée disponible.

### Validé

- vérification syntaxique : OK
- contrôle du diff Git : OK
- tests Node : 163 / 163
- audit navigateur Chromium : 36 contrôles validés
- audit du parcours de connexion : 12 contrôles validés
- version effectivement servie : 0.14.0

## Parcours produit

L'application est désormais organisée autour de trois espaces :

- Explorer
- Carnet
- Bibliothèque & sources

Le parcours de fouille distingue explicitement les différentes directions
(labels, remixes, collaborations, compilations, alias/projets, chaînes,
territoires et époque) et conserve la provenance des relations utilisées.

## Connexions

Le parcours de connexion a été spécifiquement contrôlé pour :

- mémorisation de l'ID sans faux état « connecté »
- repli après vérification API réelle
- ajout indépendant d'une playlist
- reprise OAuth avec revérification
- jeton révoqué
- retour après consentement
- persistance de la clé publique
- déconnexion locale
- réouverture des réglages après échec
- suppression de clé
- comportement mobile
- absence d'erreur JavaScript dans le scénario contrôlé

## État des sources observé

- YouTube : disponible
- MusicBrainz : disponible
- Wikidata : disponible
- Discogs : disponible
- ListenBrainz : disponible mais inactif au moment du relevé
- Bandcamp : import de métadonnées fournies par l'utilisateur
- Apple Music : non configuré
- Spotify : non configuré
- SoundCloud : non configuré

## Limites de la validation

Les audits Chromium et connexion utilisent des environnements et données de test
contrôlés. Ils valident le comportement de l'application, mais ne constituent
pas une certification :

- des comptes personnels réels ;
- de la disponibilité continue des API ;
- de l'exhaustivité des catalogues externes ;
- de toutes les identités musicales ;
- de Firefox, Safari, lecteurs d'écran ou de la conformité WCAG complète.

## État de livraison

Techniquement, aucun défaut bloquant n'est actuellement révélé par la suite
automatisée.

La prochaine étape avant livraison finale est une revue humaine du parcours réel
et du diff, afin de distinguer :

1. défauts restant réellement à corriger ;
2. dette de maintenance non bloquante ;
3. limites produit assumées ;
4. améliorations à planifier après 0.14.
