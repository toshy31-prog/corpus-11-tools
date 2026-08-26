# Migration vers le modèle d'organisme

Statut de ce changement : **déclaré, écrit, autorisé, testé localement et publié
dans v1.5.0**. L'installation, l'accès en contexte, l'exercice et la
réobservation restent propres à chaque hôte et à chaque nouvelle tâche ; la
publication ne les présume pas.

## Problème corrigé

L'architecture séparait correctement produit, archives, laboratoires,
recherches et transferts, mais elle ne nommait pas leur continuité commune dans
la surface chargée par le routeur. Cela permettait de lire les invariants comme
un « noyau persistant » inchangé et de traiter les releases comme des ajouts
externes, alors qu'elles ont déjà transformé le comportement, les instruments
et les frontières du projet.

## Transformation

| Avant | Après | Conservation |
|---|---|---|
| noyau persistant implicite | continuité par invariants, relations et lignée | les invariants restent actifs sans monopoliser l'identité |
| releases décrites dans les documents | release installée = corps actif | chaque release reste adressable par tag et commit |
| archives séparées | mémoire historique non exécutoire | aucun original n'est supprimé ou promu |
| recherches séparées | sensorium borné de l'organisme | les résultats restent hors du runtime produit |
| transferts comme registre | membrane explicite d'intégration | acceptation, rejet et retrait restent auditables |
| tests comme validation de paquet | non-régression et signaux de réparation | aucun test n'est promu en preuve universelle |

## Registre des gains et pertes

Gain attendu : une question sur « ce qu'est Corpus maintenant » doit partir de
la release effectivement installée et de sa lignée, sans retomber sur la couche
la plus ancienne simplement parce qu'elle est persistante.

Pertes évitées : provenance 10.x, identités de capabilities, dépendances,
statuts scientifiques, frontières produit/recherche, alternatives non résolues
et conditions de renversement restent inchangés.

Risque introduit : le vocabulaire organique pourrait faire croire à une
conscience, une autonomie ou une absorption automatique de la recherche. Le
contrat l'interdit explicitement et maintient les niveaux décrit, présent,
publié, installé, accessible, exercé et réobservé.

## Condition de renversement

Retirer cette représentation si elle modifie le routage d'une scène qui ne
porte pas sur Corpus, si elle fait franchir la frontière recherche → produit
sans transfert accepté, si elle masque la version installée, ou si elle rend
une version antérieure moins reconstructible.

## Réouverture et retour

Le changement est additif et localisé au contrat de routage, à son état
machine-lisible et aux validateurs. Le retour consiste à retirer les deux
références du routeur et les nouveaux fichiers ; les tags, archives, skills,
relations, recherches et transferts restent intacts. Une future release devra
mettre à jour l'état courant et ajouter sa transition sans réécrire les commits
antérieurs.

L'entrée courante de la lignée est ancrée par son tag et garde `commit: null` :
un fichier contenu dans une release ne peut pas embarquer sans circularité le
hash du commit qui le contient. Lors de la transition suivante, ce hash devenu
historique peut être inscrit exactement, tandis que la nouvelle entrée courante
reste ancrée par son tag.

La lignée ne transforme pas non plus une succession de versions en ascendance
Git fictive. L'audit pré-release a distingué les tags locaux historiques des
tags publics d'`origin` : v1.1.0 à v1.3.0 divergeaient localement, alors que la
lignée publique forme bien une ascendance continue jusqu'à v1.4.0. L'état
machine-lisible conserve donc les objets et commits des tags publics, sans
déplacer ni republier les tags locaux divergents. v1.0.0 reste un ancrage local
documenté, car aucun tag public de ce nom n'était présent lors de l'audit.

Les validateurs utilisent les commits gelés pour l'ascendance hors ligne,
plutôt que de laisser un espace de tags local réécrire l'histoire publique. Une
option distincte vérifie les objets et commits d'`origin` après le push.
