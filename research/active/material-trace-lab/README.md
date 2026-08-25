# Laboratoire des traces matérielles

## Objet

Mesurer, sur un petit système réellement distribué, la différence entre
l’indisponibilité apparente d’une information, son effacement persistant et sa
réactivation par une copie, un journal, un cache ou un pair retardé.

Ce projet apporte des observations matérielles à la recherche ; il ne cherche
ni à confirmer une hypothèse temporelle par définition, ni à fabriquer une
nouvelle couche de stockage.

## Première question

> Dans quelles configurations de réplication, de panne et de suppression une
> trace reste-t-elle récupérable après qu’un protocole la déclare effacée ?

## Premier protocole admissible

- trois nœuds contrôlés, journal d’événements horodaté et identifiants de trace non sensibles ;
- scénarios documentés avec l’exécution : écriture, réplication, lecture, suppression, partition, reconnexion et tentative de récupération ;
- mesures séparées : présence physique, accessibilité normale, délai de suppression, chemins de réactivation et coût de réparation ;
- contrôles : réplication désactivée, suppression vérifiée sur tous les nœuds, et même charge sans incident.

## Frontière

Le laboratoire ne traite pas de données personnelles ou de secrets réels. Les
jeux de données sont synthétiques et les journaux ne doivent contenir aucune
identité exploitable.

## Décision et arrêt

Un premier cycle vaut s’il produit un jeu de traces rejouable et une différence
entre au moins deux architectures appariées. Il s’arrête si le banc matériel ou
les scénarios ne sont pas disponibles, ou si tous les écarts observés se
réduisent aux paramètres déjà déclarés sans nouvelle prédiction.

Voir [`state/current_state.md`](state/current_state.md).

## Cycle synthétique initial

Le contrôle de modèle à trois nœuds est décrit dans
[`protocols/initial_synthetic_protocol.md`](protocols/initial_synthetic_protocol.md)
et s'exécute avec `python3 tests/test_initial_protocol.py`. Son résultat est
strictement `model_internal` et ne remplace pas le futur banc matériel.
