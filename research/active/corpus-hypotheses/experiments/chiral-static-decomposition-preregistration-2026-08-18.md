# Préenregistrement — décomposition statique des réponses chirales P1/P2

Date de gel : 2026-08-18

Statut : **audit confirmatoire pré-calcul**. Les sorties de P1 et P2 sont connues ; ce document fixe avant calcul la hiérarchie d'invariants statiques utilisée pour tester si ces sorties sont déterminées par des structures algébriques standards.

## Question

À quel niveau d'une hiérarchie statique standard les profils dynamiques `C_profile^(1)` et `C_profile^(2)` deviennent-ils déterminés ? Existe-t-il des classes restant statiquement indiscernables selon la hiérarchie gelée mais dynamiquement séparées ?

Le test ne cherche pas un protocole dynamique supplémentaire et ne peut pas renforcer directement une hypothèse temporelle.

## Population

Toutes les `3 330` classes d'isomorphisme de magmas d'ordre 3. Les analyses principales sont faites sur les `3 192` classes chirales afin de rester comparables à P1/P2.

## Sorties gelées à expliquer

- `Y1(M) = C_profile^(1)(M) = (C_3,C_4,C_5)` du protocole arbres miroir / indice de collision.
- `Y2(M) = C_profile^(2)(M) = (C_2,C_3,C_4)` du protocole chaînes de translations / distributions de rang.
- `Y12(M) = (Y1(M),Y2(M))`.

Aucune redéfinition ni seuillage nouveau de ces sorties n'est autorisé.

## Principe de l'audit

Pour chaque niveau `I_k`, les classes sont partitionnées par égalité exacte du descripteur cumulatif `D_k=(I_0,...,I_k)`. Une cellule est dite **résiduelle pour Y** si elle contient au moins deux classes ayant des valeurs différentes de `Y`.

On mesure :

- `R_k(Y)` : nombre de cellules résiduelles ;
- `N_k(Y)` : nombre de classes appartenant à une cellule résiduelle ;
- `M_k(Y)` : taille maximale d'une cellule résiduelle.

La sortie est **déterminée au niveau k** si `R_k(Y)=0`.

## Niveau I0 — contrôles statiques historiques

Descripteur cumulatif déjà gelé dans P1 :

- `d_chi` ;
- `A_chi` ;
- nombre d'idempotents ;
- multiensemble des fréquences de sortie ;
- nombre de triplets associatifs ;
- nombre de paires commutatives ordonnées ;
- taille du groupe d'automorphismes ;
- multiensemble combiné des rangs des translations gauche/droite.

## Niveau I1 — types fonctionnels des translations élémentaires

Pour chaque transformation finie `f:{0,1,2}->{0,1,2}`, définir son type de conjugaison sous renommage comme le représentant lexicographique minimal de `p o f o p^{-1}` sur toutes les permutations `p`.

Pour un magma `M`, calculer les multisets de types de conjugaison des trois `L_a` et des trois `R_a`.

Comme les sorties `Y1` et `Y2` sont des magnitudes invariantes sous opposition, le descripteur `I1` est la paire non ordonnée (canonisée lexicalement) des deux multisets gauche/droite.

Ce niveau contient strictement plus d'information que les seuls rangs des translations élémentaires mais aucune composition de translations.

## Niveau I2 — invariants standards des semigroupes de translations

Construire séparément les sous-semigroupes de transformations engendrés par `{L_a}` et `{R_a}` sous composition.

Pour chacun enregistrer :

- cardinal du semigroupe ;
- multiensemble des rangs de ses éléments ;
- nombre d'idempotents ;
- multiensemble des tailles d'images ;
- multiensemble des tailles des fibres maximales ;
- nombre d'éléments bijectifs.

Le descripteur `I2` est la paire non ordonnée des signatures gauche/droite. Aucun mot générateur ni fréquence de génération n'est conservé ; ce niveau ne reproduit donc pas directement P2.

## Niveau I3 — signature standard de l'associateur

Sur les 27 triplets `(a,b,c)`, définir les deux sorties

- `u=(a*b)*c` ;
- `v=a*(b*c)`.

Enregistrer :

- multiensemble non orienté des paires `{u,v}` sur les 27 triplets ;
- histogramme des valeurs de `u` ;
- histogramme des valeurs de `v`, les deux histogrammes étant canonisés comme paire non ordonnée ;
- nombre de triplets `u=v` ;
- multiensemble des tailles de fibres de la fonction `(a,b,c)->(u,v)` après canonisation de la paire de sorties par ordre numérique.

Sous renommage, les labels des sorties sont eux-mêmes canonisés en minimisant la signature sur les six permutations d'éléments. Sous opposition, la signature doit rester identique.

## Niveau I4 — profil de petits termes sans pondération dynamique

Considérer toutes les formes d'arbres binaires pleins à 3 et 4 feuilles, mais uniquement leurs **tables d'opérations de termes canonisées sous renommage**, sans distributions de sortie, sans indice de collision et sans appariement miroir.

Pour chaque forme, calculer la table de fonction `M^n -> M`, puis son orbite canonique sous permutation simultanée des labels d'entrée/sortie. Le descripteur `I4` est le multiensemble non ordonné de ces types de fonctions pour `n=3,4`.

Ce niveau est volontairement riche et proche de la structure de termes, mais reste statique et ne contient pas les valeurs de `Y1` ou `Y2`.

## Règles de décision confirmatoires

### H3a — absorption standard

`standard_absorption` si `Y1` et `Y2` sont tous deux déterminés à un niveau `k<=3`.

Interprétation : les deux profils sont entièrement expliqués par des invariants standards de translations/semigroupes/associateur dans cette population.

### H3b — absorption tardive

`term_absorption` si au moins une sortie n'est pas déterminée à `k<=3` mais `Y12` est déterminé à `k=4`.

Interprétation : le résidu nécessite une description statique plus riche des opérations de termes, sans justifier un nouvel invariant intrinsèque.

### H3c — résidu exact

`residual` si `R_4(Y1)>0` ou `R_4(Y2)>0`.

Interprétation : au moins une paire de classes reste indiscernable selon toute la hiérarchie gelée mais séparée dynamiquement. Cela justifie seulement une nouvelle analyse structurelle, pas une nouvelle lecture physique.

## Contrôle croisé commun

On recherche en plus des cellules avec même `D_k` mais séparation simultanée sur `Y1` et `Y2`. On note `R_k(Y12-separate)` le nombre de cellules contenant au moins deux classes différentes à la fois sur `Y1` et sur `Y2`.

Ce comptage est secondaire mais gelé avant calcul.

## Contrôles obligatoires

1. Tous les descripteurs `I0..I4` doivent être invariants sous renommage.
2. Comme ils sont utilisés pour expliquer des magnitudes, ils doivent être invariants sous opposition.
3. Les sorties P1/P2 doivent être reproduites exactement par les définitions déjà versionnées.
4. Toutes les partitions et égalités sont exactes ; aucune distance approchée, clustering ou modèle appris.
5. Toute violation invalide l'audit.

## Interprétation bornée

Cet audit peut montrer qu'un profil dynamique est absorbé par une description statique standard ou qu'un résidu persiste relativement à une hiérarchie gelée. Il ne peut pas prouver l'existence d'un canal intrinsèque, d'un invariant nouveau, d'une orientation macroscopique ou d'une émergence temporelle.
