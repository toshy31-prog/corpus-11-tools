# Préenregistrement — raffinement minimal par l'associateur

Date de gel : 2026-08-18

Statut : **audit de clôture pré-calcul**. Cet audit ne peut pas réhabiliter H1, H2 ou H3. Il vise seulement à identifier le plus petit raffinement statique de `I2` suffisant pour rendre constants les profils P1 et P2.

## Question

Quel est le premier raffinement cumulatif de `I2` dérivé du défaut d'associativité qui force simultanément :

- `R_P1 = 0` ;
- `R_P2 = 0` ;
- `R_joint = 0` ?

Dès qu'un niveau atteint les trois zéros, l'audit s'arrête conceptuellement. Les niveaux plus riches peuvent être calculés pour contrôle, mais ne changent pas le niveau minimal déclaré.

## Base gelée

`I2` est exactement le niveau déjà préenregistré et exécuté dans `chiral-static-decomposition-*` : contrôles historiques + types fonctionnels des translations + signatures des semigroupes de translations gauche/droite.

Les profils à expliquer restent exactement :

- `P1 = (C_3^(1), C_4^(1), C_5^(1))` ;
- `P2 = (C_2^(2), C_3^(2), C_4^(2))`.

Aucune nouvelle sonde dynamique n'est introduite.

## Défaut d'associativité

Pour chaque triplet ordonné `(a,b,c)`, définir :

- `L(a,b,c) = (a*b)*c` ;
- `R(a,b,c) = a*(b*c)` ;
- le couple de défaut `alpha(a,b,c) = (L(a,b,c), R(a,b,c))`.

Un triplet est associatif si `L=R`.

Toutes les signatures ci-dessous sont rendues invariantes sous renommage en utilisant uniquement des histogrammes, multisets ou canonisations sous permutation des labels.

## Raffinements gelés, dans cet ordre

### A1 — nombre de défauts

`A1 = # {(a,b,c): L(a,b,c) != R(a,b,c)}`.

### A2 — histogramme des couples de sortie

`A2` est le multiensemble/histogramme des 9 types de couples `(L,R)` sur les 27 triplets, canonisé sous les 6 renommages des trois labels.

Le raffinement cumulatif est `I2 + A1 + A2`.

### A3 — structure par orbites de permutations d'entrées

Le groupe `S3` agit sur les positions du triplet `(a,b,c)`. Pour chaque orbite d'un triplet sous permutation des positions, construire la sous-distribution canonisée des couples `(L,R)` observés sur les éléments de cette orbite.

`A3` est le multiensemble trié de ces sous-distributions, canonisé sous renommage des labels de sortie.

Le raffinement cumulatif est `I2 + A1 + A2 + A3`.

### A4 — signature complète canonique du défaut

`A4` est la table complète des 27 couples `(L,R)`, canonisée sous renommage bijectif simultané des entrées et sorties. Elle sert de borne supérieure descriptive.

Le raffinement cumulatif est `I2 + A1 + A2 + A3 + A4`.

## Mesure des résidus

À chaque niveau cumulatif `J`, partitionner les 3 192 classes chirales selon leur signature statique `J`.

Une cellule contribue à `R_P1` si elle contient plus d'un profil P1 distinct ; idem pour `R_P2`. Elle contribue à `R_joint` si elle contient plus d'un couple `(P1,P2)` distinct.

On rapporte :

- nombre total de cellules ;
- `R_P1` ;
- `R_P2` ;
- `R_joint` ;
- taille maximale d'une cellule résiduelle.

## Niveau minimal suffisant

Le **minimal sufficient refinement** est le premier niveau, dans l'ordre `A1`, `A2`, `A3`, `A4`, tel que `R_P1=R_P2=R_joint=0`.

Aucun retour à un niveau précédent n'est permis selon une métrique de compression observée après coup.

## Contrôles obligatoires

1. Toutes les signatures `A1..A4` sont invariantes sous les six renommages des labels.
2. Le passage à l'opposé conserve chaque signature utilisée sous forme non orientée/canonique.
3. Les profils P1/P2 reproduisent exactement les scripts précédents.
4. Population : 3 330 classes, dont 3 192 chirales.

Échec d'un contrôle => audit invalide.

## Interprétation gelée

- Si `A1` suffit : absorption par le seul volume de non-associativité.
- Si `A2` suffit : absorption par la distribution globale des sorties de l'associateur.
- Si `A3` suffit : une organisation sous permutations des entrées est nécessaire mais une table complète ne l'est pas.
- Si seul `A4` suffit : absorption statique exacte mais faible compression explicative.
- Si même `A4` ne suffit pas : incohérence avec H3, à auditer avant toute autre conclusion.

Quel que soit le résultat, P1/P2 restent fermés comme voie expérimentale active à l'ordre 3 sauf prédiction indépendante future.