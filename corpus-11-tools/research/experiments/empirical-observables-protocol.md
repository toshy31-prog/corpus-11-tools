# Protocole d'observables empiriques

## Statut

Protocole prêt à être appliqué à un système d'information distribué contrôlé. Aucune donnée n'a été collectée. Aucun lien avec le temps physique n'est établi.

## Phénomène testable

Comparer la récupération d'un bit distribué et la désinscription de ses effets sous une même infrastructure, une même famille d'entrées et des interventions déclarées.

## Mesures par essai

1. état intégral avant écriture ;
2. port d'écriture et bit injecté ;
3. liste des porteurs et canaux accessibles ;
4. nombre minimal de lectures pour récupérer le bit ;
5. nombre d'opérations, profondeur parallèle et durée pour revenir au contrefactuel ;
6. énergie mesurée si le dispositif fournit un compteur étalonné ;
7. pannes de liens ou de nœuds injectées selon une distribution fixée ;
8. traces encore accessibles et capacité effective de réactivation ;
9. état final comparé octet par octet au contrefactuel ;
10. répétition après variation du port, de la charge, de l'ordre des opérations et du délai.

## Fenêtres et seuils

La durée maximale, le nombre de répétitions, la tolérance d'égalité, le seuil de détection énergétique, la distribution des pannes et les accès permis doivent être fixés avant l'essai. Une trace sous le seuil du capteur reste inconnue ; elle n'est pas déclarée absente.

## Résultats discriminants

- récupération égale mais profils de désinscription différents sous contrôles identiques ;
- différence persistant lorsque port, charge et ordre changent, ou variation expliquée par ces changements ;
- résidu non réductible à la collection préenregistrée : Hamming, travail, profondeur, excentricité et profils de coupes ;
- retour octet-identique mais capacité de réactivation différente, ce qui établirait un reste fonctionnel.

## Conditions d'échec

- Si toutes les composantes sont des fonctions des invariants standards préenregistrés, la mesure est une compilation utile mais non nouvelle.
- Si l'instrument ne détecte pas le niveau attendu, conclure `inconnu`, pas `absence`.
- Si la différence disparaît sous changement de port ou d'ordre, l'attribuer au protocole concerné.
- Sans canal physique indépendant reliant ces mesures à une orientation temporelle, aucune conclusion sur l'émergence du temps n'est autorisée.
