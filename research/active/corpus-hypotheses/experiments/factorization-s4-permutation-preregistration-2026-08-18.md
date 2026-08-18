# Préenregistrement — robustesse du reste de factorisation dans S4

Date de gel : 2026-08-18

Statut : **confirmatoire pré-calcul**.

## Question

Le phénomène exact observé avec trois matrices de permutation signées en dimension 3 — données fixes marginales et deux à deux identiques mais intersection triple différente — survit-il dans une seconde famille naturelle définie indépendamment du premier catalogue ?

## Famille gelée

Utiliser exactement les 24 matrices de permutation ordinaires de taille `4 x 4`, c'est-à-dire la représentation naturelle de `S4` sur `Q^4`.

Aucun signe, poids, matrice sélectionnée ni changement de base n'est ajouté.

Énumérer exhaustivement les `C(24,3)=2024` triplets non ordonnés de matrices distinctes.

## Observables

Pour un ensemble de matrices `U_1,...,U_k`, définir

`D(U_1,...,U_k) = dim intersection_i Fix(U_i)`

par algèbre linéaire rationnelle exacte.

Pour chaque triplet `(A,B,C)`, calculer :

- profil marginal : multiensemble trié de `D(A),D(B),D(C)` ;
- profil deux-à-deux : multiensemble trié de `D(A,B),D(A,C),D(B,C)` ;
- reste triple : `D(A,B,C)`.

La clé basse est `(profil marginal, profil deux-à-deux)`.

## H1 confirmatoire

Il existe au moins une clé basse réalisée par deux triplets distincts ayant des dimensions triples différentes.

Cette prédiction est satisfaite si et seulement si le nombre de clés basses avec au moins deux valeurs de dimension triple est strictement positif.

## Issues

- `transported_remainder` : au moins une clé discriminante ;
- `no_remainder` : aucune clé discriminante.

## Contrôles

- exactement 24 matrices ;
- exactement 2024 triplets ;
- rangs calculés sur rationnels exacts ;
- invariance évidente à l'ordre de présentation des trois matrices via multisets triés ;
- aucun résultat ne sera interprété physiquement.

## Interprétation gelée

`transported_remainder` renforcera uniquement la robustesse mathématique du fait que des données d'intersection jusqu'à l'ordre deux ne déterminent pas toujours l'intersection d'ordre trois dans une seconde famille naturelle. Cela ne valide pas l'identification de ce reste à un objet physique.

`no_remainder` affaiblira la généralité du premier témoin et suggérera une dépendance à la famille signée de dimension 3.
