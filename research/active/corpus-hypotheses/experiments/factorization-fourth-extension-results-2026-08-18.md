# Résultats — survie sous ajout d'une quatrième factorisation

Date : 2026-08-18

Préenregistrement : `factorization-fourth-extension-preregistration-2026-08-18.md`

Script : `run_factorization_fourth_extension.py`

## Contrôles

PASS :

- 24 matrices de permutation `4 x 4` ;
- les `C(24,3)=2024` triplets de départ sont audités ;
- la clé basse `(3,3,3)/(2,2,2)` est reproduite exactement ;
- sous cette clé : `D3=1` pour 16 triplets et `D3=2` pour 4 triplets ;
- chaque triplet reçoit exactement 21 matrices `D` restantes, soit 420 extensions ;
- algèbre linéaire rationnelle exacte ;
- la droite constante `(1,1,1,1)` est fixée par les 24 matrices de la représentation de permutation.

## Strates de contrôle

La clé gelée

`G=(D(D), multiset(D(A,D),D(B,D),D(C,D)))`

réalise 7 valeurs dans les 420 extensions. Quatre contiennent à la fois des extensions issues de triplets `D3=1` et `D3=2` et entrent dans l'analyse confirmatoire.

### G = `(4,(3,3,3))`

- groupe `D3=1` : 16 extensions, moyenne `D4=1` ;
- groupe `D3=2` : 4 extensions, moyenne `D4=2` ;
- `Delta_D4=+1` ;
- `Delta_pos=0` ;
- `Delta_full=0`.

Cette strate correspond à l'ajout de la matrice identité, qui ne réduit aucun espace fixe.

### G = `(3,(2,2,2))`

- groupe `D3=1` : 48 extensions, moyenne `D4=1` ;
- groupe `D3=2` : 12 extensions, moyenne `D4=1` ;
- `Delta_D4=0` ;
- `Delta_pos=0` ;
- `Delta_full=-1`.

### G = `(2,(2,1,1))`

- groupe `D3=1` : 72 extensions, moyenne `D4=1` ;
- groupe `D3=2` : 36 extensions, moyenne `D4=1` ;
- `Delta_D4=0` ;
- `Delta_pos=0` ;
- `Delta_full=-1`.

### G = `(1,(1,1,1))`

- groupe `D3=1` : 96 extensions, moyenne `D4=1` ;
- groupe `D3=2` : 24 extensions, moyenne `D4=1` ;
- `Delta_D4=0` ;
- `Delta_pos=0` ;
- `Delta_full=-1`.

## Résultat confirmatoire

Signes des quatre contrastes `Delta_D4` :

- positifs : `1` ;
- nuls : `3` ;
- négatifs : `0` ;
- médiane exacte : `0`.

La règle H4 exigeait au moins deux tiers de contrastes strictement positifs et une médiane strictement positive.

**Classification : `not_supported`.**

## Explication géométrique exacte dans cette famille

Toutes les matrices de permutation de `S4` fixent la droite constante

`span((1,1,1,1))`.

Par conséquent :

- les triplets de la clé ayant `D3=1` ont déjà atteint ce sous-espace commun minimal de la représentation ; leur intersection reste de dimension 1 après tout ajout `D` ;
- les triplets ayant `D3=2` possèdent une dimension supplémentaire au-delà de la droite constante ; dans les trois strates non triviales appariées, cette dimension supplémentaire est supprimée par l'ajout, et `D4` retombe à 1 ;
- seule l'identité conserve `D4=2`, ce qui est déjà visible dans la géométrie marginale `D(D)=4`.

Ainsi la survie positive est universelle ici (`D4>=1`) pour une raison de représentation standard, et la différence triple `1/2` ne produit pas la stabilité prospective supplémentaire préenregistrée.

## Décision scientifique bornée

Le résultat précédent `transported_remainder` reste exact : les données marginales et deux-à-deux du triplet ne déterminent pas `D3`.

Mais H4 échoue : **la valeur supérieure `D3=2` ne prédit pas une meilleure survie sous ajout non trivial d'une quatrième factorisation après contrôle bas ordre de l'ajout.**

Dans cette représentation, le reste triple doit donc être interprété avec davantage de prudence comme géométrie statique de bas ordre, non comme stabilité objectale prospective.

Cela ne réfute pas l'hypothèse générale des invariants de factorisation dans d'autres familles ; cela affaiblit la lecture de ce témoin `S4` comme prototype de persistance sous ajout de factorisations.

## Prochaine décision

Ne pas prolonger immédiatement à cinq factorisations dans la même représentation : la droite constante rendrait la survie positive triviale et le test intégrerait le même plancher géométrique.

La prochaine expérience factorisation, si elle est poursuivie, doit changer de famille de transports de façon préenregistrée pour retirer le sous-espace fixe commun forcé, ou tester une notion de persistance normalisée par l'intersection commune de toute la famille.
