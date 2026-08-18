# Préenregistrement — transport récupération/désinscription en processus OS séparés

Date de gel : 2026-08-18

Statut : **dernier transport logiciel local prospectif**. Ce banc utilise plusieurs processus du même hôte ; il n'est pas du matériel distribué ni un réseau externe.

## Question

La séparation A/B observée dans le modèle exact et l'event loop locale survit-elle lorsque les cinq nœuds internes sont portés par cinq processus OS persistants distincts, avec ordre effectif déterminé par temporisation et scheduling du noyau ?

## Architectures et resets gelés

Réutiliser sans changement :

A : `(0,1),(0,2),(0,4),(0,5),(1,2),(2,3)`, reset `{0,2}`.

B : `(0,1),(0,2),(0,3),(0,5),(1,4),(2,3)`, reset `{0,1}`.

## Implémentation

- cinq processus worker persistants, un par nœud interne `1..5` ;
- état des six nœuds dans une structure mémoire partagée ;
- verrou partagé pour rendre atomique chaque opération lecture-prédécesseurs / écriture ;
- chaque worker reçoit pour chaque run son délai cible, la topologie, le reset et un identifiant de run ;
- un événement/barrière de départ libère les cinq workers pour le run ;
- chaque worker attend son délai via `time.sleep`, horodate `perf_counter_ns`, puis sous verrou applique la même règle OR ou reste clampé à 0 ;
- les workers renvoient timestamp, nœud et état final au processus contrôleur.

## Plans de latence

Utiliser les 120 permutations des nœuds `1..5`.

Attribuer les délais `2,4,6,8,10 ms` selon la permutation.

Répéter chaque permutation exactement **deux fois** par architecture :

- 240 runs A ;
- 240 runs B ;
- 480 runs totaux.

Les délais plus espacés que dans `asyncio` sont gelés avant exécution pour réduire les égalités d'ordonnancement entre processus, sans supposer que l'ordre cible sera toujours respecté.

## Observables

- ordre cible ;
- ordre réel selon `perf_counter_ns` ;
- état final ;
- nombre de traces résiduelles ;
- succès/échec d'effacement ;
- durée murale du run ;
- comparaison au simulateur discret conditionné par l'ordre réel.

## H1

A doit réussir `100 %` des runs ; B doit échouer au moins une fois.

## H2

Zéro divergence entre le résultat multi-processus et le simulateur discret alimenté par l'ordre réellement horodaté.

## Issues

- `multiprocess_transport` : H1 et H2 passent ;
- `multiprocess_no_separation` : H2 passe mais H1 échoue ;
- `multiprocess_model_mismatch` : au moins une divergence H2.

## Arrêt

Quel que soit le résultat, ne pas ajouter un quatrième banc logiciel local du même mécanisme. Une promotion supplémentaire exige ensuite un réseau externe, plusieurs machines, microcontrôleurs ou autre dispositif réellement distinct, avec protocole préenregistré.
