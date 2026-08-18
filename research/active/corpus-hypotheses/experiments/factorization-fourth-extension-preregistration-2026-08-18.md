# Préenregistrement — survie du reste de factorisation sous ajout d'une quatrième factorisation

Date de gel : 2026-08-18

Statut : **confirmatoire pré-calcul**. Ce document est gelé avant inspection des sorties à quatre factorisations.

## Question

Dans la famille naturelle des 24 matrices de permutation de `S4` sur `Q^4`, le reste d'intersection triple observé sous une même clé basse prédit-il la survie d'un sous-espace fixe après ajout prospectif d'une quatrième matrice, au-delà de la géométrie d'incidence de bas ordre entre cette quatrième matrice et le triplet ?

Le test porte uniquement sur une propriété de géométrie linéaire finie. Il ne teste pas l'existence d'objets physiques.

## Population de départ gelée

Le test précédent a identifié la clé basse suivante :

- dimensions fixes marginales du triplet : `(3,3,3)` ;
- dimensions d'intersection deux-à-deux : `(2,2,2)`.

Sous cette clé, les triplets distincts réalisent deux valeurs de dimension triple : `D3=1` et `D3=2`.

Tous les triplets de cette clé sont inclus, sans sélection supplémentaire.

Pour chaque triplet non ordonné `T={A,B,C}`, chaque matrice `D` parmi les 21 matrices de permutation restantes est ajoutée prospectivement. Chaque extension `(T,D)` est donc déterminée avant lecture de `D4`.

## Observable cible

Pour un ensemble de matrices, noter

`D(U_1,...,U_k) = dim intersection_i Fix(U_i)`.

Pour chaque extension :

- `D3 = D(A,B,C)` ;
- `D4 = D(A,B,C,D)`.

Deux mesures de survie sont gelées :

1. **survie positive** : `S_pos = 1[D4 > 0]` ;
2. **survie intégrale** : `S_full = 1[D4 = D3]`.

`D4` lui-même reste l'issue ordinale exacte principale.

## Contrôle géométrique bas ordre de l'ajout D

Pour éviter d'attribuer à `D3` une différence expliquée simplement par la relation de `D` avec les trois transports initiaux, définir avant calcul la clé de contrôle

`G(T,D) = ( D(D), multiset{D(A,D),D(B,D),D(C,D)} )`.

La clé utilise uniquement :

- la dimension fixe marginale de `D` ;
- ses trois intersections deux-à-deux avec les matrices du triplet.

Elle n'utilise ni `D3` ni `D4` et est invariante à l'ordre de présentation de `A,B,C`.

## Analyse appariée confirmatoire

Une strate de contrôle est une valeur de `G` contenant au moins une extension issue d'un triplet `D3=1` et au moins une extension issue d'un triplet `D3=2`.

Pour chaque strate `g`, calculer exactement :

- moyenne de `D4` dans le groupe `D3=2` moins moyenne de `D4` dans le groupe `D3=1`, notée `Delta_D4(g)` ;
- différence de fréquence de survie positive `Delta_pos(g)` ;
- différence de fréquence de survie intégrale `Delta_full(g)`.

Aucun réappariement ne sera effectué après lecture des résultats.

## Hypothèse confirmatoire H4

**H4.** Le reste triple supérieur (`D3=2`) possède une stabilité prospective qui n'est pas absorbée par la géométrie bas ordre de l'ajout `D`.

H4 est classée `supported_survival` si les deux conditions suivantes sont satisfaites :

1. au moins deux tiers des strates appariées ont `Delta_D4(g) > 0` ;
2. la médiane exacte des `Delta_D4(g)` sur toutes les strates appariées est strictement positive.

Les mesures `Delta_pos` et `Delta_full` sont secondaires confirmatoires et servent à interpréter la nature de la survie, pas à reclasser H4 si la règle principale échoue.

## Issues

- `supported_survival` : règle H4 satisfaite ;
- `not_supported` : règle H4 non satisfaite ;
- `reversed` : au moins deux tiers des strates ont `Delta_D4(g) < 0` et la médiane est négative ;
- `unidentified` : aucune strate appariée n'existe sous la clé `G`.

## Contrôles obligatoires

- exactement 24 matrices de permutation `4 x 4` ;
- exactement `C(24,3)=2024` triplets de départ audités ;
- reproduction exacte de la clé `(3,3,3)/(2,2,2)` et de ses comptes `D3=1:16`, `D3=2:4` avant l'étape d'extension ;
- chaque triplet de la clé reçoit exactement 21 matrices `D` distinctes des trois matrices initiales ;
- algèbre linéaire rationnelle exacte ;
- invariance à l'ordre de `A,B,C` via multisets et ensembles ;
- aucun résultat n'est interprété si un contrôle échoue.

## Interprétation gelée

`supported_survival` montrerait seulement que, dans cette famille, la différence d'intersection triple transporte une information prospective sur l'intersection quadruple qui n'est pas éliminée par les dimensions marginales et deux-à-deux impliquant `D`.

`not_supported` indiquerait que le reste triple ne fournit pas la stabilité prospective recherchée sous ce contrôle ; cela favoriserait une lecture de bas ordre ou fortement géométrique du phénomène.

Même un succès ne justifie pas l'identification de `D_I` à un objet physique, ni une émergence temporelle.

## Exploratoire après classification

Seulement après H4 :

- raffiner `G` par dimensions d'intersections triples contenant `D` ;
- analyser les sous-groupes engendrés par les permutations ;
- tester des familles de matrices non permutationnelles ;
- étudier cinq factorisations ou plus.

Ces analyses ne peuvent pas reclasser H4.
