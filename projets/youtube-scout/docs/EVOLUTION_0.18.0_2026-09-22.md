# Scout 0.18.0 — fouilles éphémères, choix personnels conservés

## Décision et périmètre

À la demande de l’utilisateur, arrêter la mémoire automatique des fouilles, sans effacer la bibliothèque ni les choix explicites. Les observations précédentes ont montré une amplification possible de la présence d’EDGE par le graphe accumulé ; elles ne démontrent pas que chaque recommandation d’EDGE est erronée. Un chemin fraîchement documenté peut toujours le faire apparaître.

La séparation fonctionnelle et la validation du changement Corpus guident cette livraison : conservation des choix délibérés, isolation des calculs automatiques et vérification distincte de l’activation. Ce n’est ni une reconstruction globale ni une remise à zéro des données personnelles.

## Changements réalisés

- Un contexte serveur en RAM par départ, identifié par un jeton non stocké dans le navigateur. Graphes, réponses et curseurs de catalogue, résolutions et caches de travail ne sont plus communs aux différents départs ou onglets.
- Changer de départ ferme l’ancien contexte. Les réponses tardives sont rejetées côté client et les opérations sur un contexte fermé sont refusées côté serveur. Le retour à un départ ouvre une recherche neuve, pas son ancien vivier.
- Recharger ou fermer la page termine la fouille. Une page restaurée depuis le cache de navigation est rechargée pour ne pas ressusciter un contexte fermé. Expiration après six heures d’inactivité, maximum 32 contextes ouverts ; contrôle à l’accès et à l’ouverture.
- La bibliothèque importée, le carnet, les corrections de titre/artiste, les décisions explicites d’identité et les réglages restent durables. Le nouveau fichier personnel séparé ne reçoit que ces décisions d’identité ; les autres données personnelles continuent dans leurs stockages existants.
- Les anciens graphes et sessions restent des archives hors circuit. Seuls leurs choix explicites d’identité sont projetés vers le nouveau stockage personnel ; aucun voisinage de catalogue n’est repris.
- Le sélecteur peut consulter la bibliothèque complète, mais le graphe actif n’est enrichi qu’avec les membres du départ choisi et les résultats de sa recherche. Une playlist reste un départ collectif, sans devenir un artiste.
- Importer une ancienne sauvegarde conserve ses données personnelles et réglages sans réactiver graphe automatique, historique de consultation ou fouille. Exporter une nouvelle sauvegarde applique la même frontière.
- L’ingestion automatique n’effectue pas de copie du graphe accumulé pour isoler une fouille. Les correctifs de performance déjà préparés avant cette évolution restent en place.

## Épreuves

Commande complète, avec Node 24 et ports de test temporaires :

```sh
SCOUT_GOOGLE_CLIENT_ID='' SCOUT_GOOGLE_CLIENT_SECRET='' node --test --test-reporter=tap server.test.mjs lib/*.test.mjs public/*.test.mjs tests/*.test.mjs
```

Les nouveaux tests couvrent : isolation entre départs, archives exclues, absence d’écriture automatique, corrections persistantes après redémarrage, conservation byte-à-byte de l’archive source, contexte fermé/expiré, réponses tardives, vingt ingestions concurrentes, échec disque d’une correction, copie évitée du graphe sans rapport, sauvegardes anciennes et réglages conservés.

Résultat final : **688 tests réussis, zéro échec** ; journal local `/tmp/scout-ephemeral-tests-final.tap`. Vérifications `node --check public/app.js`, `node --check server.mjs` et `git diff --check` réussies. Ce résultat ne mesure pas un gain de vitesse réel des catalogues externes.

Vérification réelle de l’interface dans un onglet de test dédié, port 4198 : import d’une sauvegarde synthétique contenant deux vidéos et une ancienne mémoire EDGE ; bibliothèque restaurée sans ancienne fouille ; formulaire stable avant validation ; titre/artiste corrigés conservés ; après rechargement, exploration vide ; à la réouverture du même morceau, formulaire prérempli avec la correction. Fournisseurs externes désactivés pour cette épreuve : elle ne mesure pas la pertinence musicale réelle.

Le script historique `scripts/evolution-browser-audit.mjs` décrit l’ancien contrat de session persistante ; il n’est pas présenté comme une validation de 0.18. La preuve navigateur ci-dessus porte sur le parcours effectivement exécuté.

## Coûts et limites

- Une fouille n’est plus reprenable après rechargement ; ses résultats non gardés sont perdus. L’historique de navigation existe seulement pendant l’usage courant, et revenir à un départ relance son contexte.
- Le cache des fournisseurs n’est plus partagé entre départs : davantage de requêtes et de délai sont possibles lors d’une nouvelle recherche. Les budgets et limites des catalogues demeurent.
- L’isolation ne garantit pas une meilleure identification, une diversité suffisante ou l’absence d’homonymes. Elle supprime une voie de contamination historique, pas les erreurs possibles des métadonnées et des sources actuelles.
- Aucun changement des règles Google, aucune modification des playlists distantes, aucune suppression du stockage historique.

## Livraison et activation

Activation autorisée explicitement puis effectuée le 22 septembre 2026 à 03:54 (Europe/Paris). Serveur 4181 passé de 0.17.0 (PID 48907) à 0.18.0 (PID 137078), avec le même exécutable, répertoire et environnement ; aucun secret affiché et aucune connexion Google lancée.

### Correction de l’échec d’ouverture observé pendant la préparation

Le client 0.18 était déjà servi par l’ancien processus 0.17. L’ouverture du contexte échouait ; la construction du sélecteur dépendait à tort de cette API et le départ était enregistré dans l’interface avant la réussite de sa préparation.

- Construction locale du sélecteur avant tout appel serveur, y compris au chargement après import. L’échec réseau n’interrompt plus la fin de l’initialisation de l’interface.
- Retour à l’accueil utilisable après échec, sans suppression de bibliothèque ou carnet et sans écraser un départ plus récent.
- Message explicite pour le serveur incompatible ; réponse sans jeton refusée ; tentative ratée non mémorisée afin de permettre une nouvelle ouverture.
- Suite finale : **692 tests réussis, zéro échec**, journal `/tmp/scout-opening-fix-tests.tap`. Syntaxe client/serveur et `git diff --check` réussis.
- Navigateur réel, nouvel onglet de contrôle sur 4181 : 4 811 départs visibles dans la collection existante avant le redémarrage malgré l’API incompatible ; échec provoqué avec retour à l’accueil ; après activation, nouvelle tentative du même morceau réussie jusqu’au formulaire de validation manuelle, sans rechargement de l’onglet de contrôle, sans réimport et sans connexion Google. Aucun catalogue externe n’a été sollicité en validant ce formulaire pendant ce contrôle.
- `/api/health` annonce `0.18.0` et `ephemeral_per_departure` ; nouveau contexte créé, graphe vide vérifié, puis contexte fermé. Le client corrigé est effectivement servi.
- Sauvegarde privée : `.data/backups/pre-0.18.0-2026-09-22T01-54-16.893Z-0.json`, permissions 600. SHA-256 du stockage historique avant et après activation : `5e9e0d7b3bfb6b373348e24c913d964765261e095756e895c19dec0a4d8b7a49`, inchangé.

Cette activation corrige les défauts d’ouverture et de collection vide observés. Elle ne certifie pas la qualité musicale de toutes les recommandations ni le fonctionnement de l’import privé avec Google expiré. Le navigateur personnel déjà ouvert doit être rechargé pour prendre le client corrigé ; il n’a pas été rechargé automatiquement.
