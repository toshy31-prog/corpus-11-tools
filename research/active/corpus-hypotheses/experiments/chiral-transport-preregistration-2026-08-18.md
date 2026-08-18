# Préenregistrement — transport hors protocole du contraste chiral

Date de gel : 2026-08-18

Statut : **confirmatoire pré-calcul du protocole 2**. Les partitions et résultats du protocole 1 sont connus et gelés ; aucune sortie du protocole 2 ne doit être inspectée avant fixation des définitions et seuils ci-dessous.

## Question

Les séparations dynamiques observées dans le protocole 1 transportent-elles un contraste vers une seconde famille neutre qui n'utilise ni arbres binaires, ni parenthésages miroir, ni indice de collision de sortie ?

Le test ne cherche pas un nouvel invariant et ne suppose pas l'existence d'un canal intrinsèque. Il teste seulement la transportabilité hors protocole d'une partition déjà gelée.

## Population et partitions gelées

La population reste l'ensemble complet des classes d'isomorphisme de magmas d'ordre 3.

Le protocole 1 a gelé pour chaque classe chirale :

- `d_chi` ;
- `A_chi` ;
- six covariables structurelles ;
- `C_profile^(1)=(C_3,C_4,C_5)` ;
- le statut `strongly_couplable^(1)`.

Une strate statique est la clé exacte `(d_chi,A_chi,6 covariables)`. Les **42 strates** qui contiennent au moins une classe forte et une classe faible selon le protocole 1 sont la population confirmatoire du test de transport. Leur appartenance fort/faible ne pourra jamais être recalculée avec le protocole 2.

## Indépendance du protocole 2

Le protocole 2 n'utilise pas :

- les arbres binaires pleins ;
- leurs miroirs ;
- les distributions de sortie d'un parenthésage ;
- l'indice de collision `sum p(y)^2` ;
- le seuil `1/27` pour définir ses réponses.

Il utilise à la place des **chaînes de translations composées** et compare leurs spectres de rang. C'est une autre sonde de la table : elle agit sur les transformations internes `x -> a*x` et `x -> x*a` plutôt que sur l'évaluation globale de termes parenthésés.

## Famille dynamique neutre gelée

Pour chaque élément `a`, définir les applications sur l'ensemble à trois éléments :

- `L_a(x)=a*x` ;
- `R_a(x)=x*a`.

Pour un mot d'éléments `w=(a_1,...,a_h)`, définir les compositions dans l'ordre d'application :

- `L_w = L_{a_h} o ... o L_{a_1}` ;
- `R_w = R_{a_h} o ... o R_{a_1}`.

Tous les mots de longueur `h` sont énumérés uniformément et exactement pour `h in {2,3,4}`.

Sous passage à l'opposé, les familles `L` et `R` s'échangent exactement. Sous renommage des éléments, chaque application est conjuguée par la permutation de renommage. Les observables ci-dessous sont donc insensibles aux labels et leur différence signée doit s'inverser sous `M -> M^op`.

## Observable du protocole 2

Pour une application finie `f` sur trois éléments, définir son **rang**

`rank(f)=|image(f)|`.

Pour chaque horizon `h` et rang `r in {1,2,3}`, définir les fréquences exactes :

- `P_L(h,r)` = fraction des `3^h` mots dont `rank(L_w)=r` ;
- `P_R(h,r)` = fraction des `3^h` mots dont `rank(R_w)=r`.

La réponse signée est le vecteur

`D_h(M)=(P_L(h,1)-P_R(h,1), P_L(h,2)-P_R(h,2), P_L(h,3)-P_R(h,3))`.

Définir la magnitude protocolaire

`C_h^(2)(M) = (1/2) * sum_r |D_h(M)[r]|`.

Ainsi `C_h^(2)` est la distance de variation totale entre les distributions de rang des chaînes gauche et droite. Elle appartient à `[0,1]`.

Le profil protocolaire 2 est

`C_profile^(2)=(C_2^(2),C_3^(2),C_4^(2))`.

La magnitude résumée utilisée pour le transport est

`B^(2)(M)=max(C_2^(2),C_3^(2),C_4^(2))`.

Aucun seuil fort/faible ne sera redéfini à partir du protocole 2.

## Contrôles obligatoires

1. Pour toute classe auto-opposée, `D_h=0` et `C_h^(2)=0` pour `h=2,3,4`.
2. Pour toute classe, `D_h(M^op)=-D_h(M)` exactement.
3. Un renommage bijectif conserve `C_profile^(2)` exactement.
4. Toutes les fréquences sont des fractions rationnelles exactes ; aucune simulation Monte-Carlo.
5. Aucun résultat n'est interprété si un contrôle échoue.

## Contraste gelé de transport

Pour chaque strate confirmatoire `S`, définir à partir du protocole 1 :

- `S_+` = classes `strongly_couplable^(1)` ;
- `S_-` = classes non fortes dans le protocole 1.

Après seulement l'ouverture du protocole 2, calculer

`Delta_S^(2) = median_{M in S_+} B^(2)(M) - median_{M in S_-} B^(2)(M)`.

Les médianes sont les médianes exactes usuelles ; pour un effectif pair, moyenne des deux valeurs centrales.

Aucune classe ne peut changer de groupe selon `B^(2)`.

## Règle globale confirmatoire

Soit :

- `N_pos` = nombre de strates avec `Delta_S^(2) > 0` ;
- `N_zero` = nombre avec `Delta_S^(2) = 0` ;
- `N_neg` = nombre avec `Delta_S^(2) < 0` ;
- `Delta_med` = médiane exacte des 42 contrastes.

La transportabilité du contraste est classée :

- `transported` si `N_pos >= 28` (au moins deux tiers des 42 strates) **et** `Delta_med > 0` ;
- `reversed` si `N_neg >= 28` et `Delta_med < 0` ;
- `not_transported` dans tous les autres cas.

Le seuil de deux tiers est une règle opérationnelle gelée, pas une constante théorique.

## Contrôle prédictif hors protocole

Une règle de score est gelée avant ouverture du protocole 2 :

`P1_score(M) = C_3^(1)(M) + C_4^(1)(M) + C_5^(1)(M)`.

Dans chacune des 42 strates, elle prédit que la classe ayant le plus grand `P1_score` aura une valeur `B^(2)` supérieure ou égale à celle de la classe ayant le plus petit `P1_score`. En cas d'égalité du score P1 à une extrémité, toutes les classes ex aequo sont comparées via la moyenne exacte de leur `B^(2)`.

Une strate est un succès prédictif strict si la moyenne `B^(2)` du maximum P1 est strictement supérieure à celle du minimum P1 ; égalité = nul ; inférieure = échec.

Le contrôle prédictif est `predictive_transport` si au moins 28 des 42 strates sont des succès stricts. Sinon il est `no_predictive_transport`.

Cette règle n'utilise aucune caractéristique apprise du protocole 2.

## Hypothèse confirmatoire unique H2

**H2.** Une partie substantielle du contraste fort/faible découvert sous le protocole 1 se transporte vers la famille indépendante de chaînes de translations : la classification de contraste doit être `transported` et le contrôle prédictif doit être `predictive_transport`.

Les deux conditions sont nécessaires.

## Issues

- `supported_transport` : contraste `transported` ET prédiction `predictive_transport` ;
- `contrast_only` : contraste `transported`, prédiction absente ;
- `prediction_only` : prédiction présente sans contraste global transporté ;
- `not_transported` : aucune des deux ;
- `reversed` : contraste global inversé, quelle que soit la prédiction.

Aucune issue ne transforme `C^(1)` ou `C^(2)` en invariant intrinsèque.

## Interprétation gelée

- `supported_transport` autorise seulement l'inférence qu'une partition issue du protocole 1 conserve un pouvoir de discrimination sous une seconde sonde indépendante déclarée.
- `not_transported` indique que les résumés du protocole 1 ne transportent pas le contraste selon cette seconde sonde ; cela n'implique pas absence de toute propriété intrinsèque.
- `reversed` indique une dépendance forte au protocole et affaiblit davantage toute lecture intrinsèque du premier profil.

## Exploratoire après classification

Seulement après H2 : corrélations classe par classe entre profils, recherche d'invariants statiques manquants, horizons de chaînes >4, autres observables de transformations, ordre 4.

Ces analyses ne peuvent pas reclasser H2.
