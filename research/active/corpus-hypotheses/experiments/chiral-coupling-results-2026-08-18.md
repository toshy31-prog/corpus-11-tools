# Résultats — couplage chiral, magmas d'ordre 3

Date d'exécution : 2026-08-18

Préenregistrement : `chiral-coupling-preregistration-2026-08-18.md`

Script : `run_chiral_coupling_order3.py`

## Portée

Calcul exact sur toute la population des tables étiquetées d'ordre 3, quotientée par isomorphisme. Aucune donnée physique, aucune simulation Monte-Carlo et aucune interprétation temporelle empirique ne sont introduites.

## Contrôles

Tous les contrôles préenregistrés passent exactement :

- `19 683` tables étiquetées énumérées ;
- `3 330` classes d'isomorphisme ;
- `3 192` classes chirales, c'est-à-dire non isomorphes à leur opposé ;
- zéro classe auto-opposée avec profil de couplage non nul ;
- zéro violation de l'inversion de signe sous passage à l'opposé ;
- zéro violation du profil sous renommage par le contrôle `0 <-> 1` appliqué à toutes les classes ;
- arithmétique des indices de collision en fractions rationnelles exactes.

## Résultat confirmatoire principal

Le seuil gelé définissait une classe `strongly_couplable` lorsqu'au moins deux des trois composantes `C_3,C_4,C_5` étaient supérieures ou égales à `1/27`.

Résultat :

`1690 / 3192 = 845 / 1596 = 0,5294486215...`

soit **52,94 %** des classes chirales.

Le préenregistrement exigeait `0,01 <= p_strong <= 0,25` pour la branche de « transductivité minoritaire mais non nulle ».

**Classification confirmatoire : `too_common`.**

La branche « la transductivité protocolaire forte forme une sous-population rare à l'ordre 3 » est donc renversée dans cette famille de protocoles.

## La lisibilité statique n'épuise pas le couplage protocolaire

Le second critère du préenregistrement cherchait des classes ayant exactement les mêmes valeurs de `d_chi`, `A_chi` et des six covariables structurelles déclarées, mais séparées par le statut `strongly_couplable`.

**42 strates exactes** satisfont ce critère.

Premier exemple canonique trouvé, avec clé statique commune :

- `d_chi = 1` ;
- `A_chi = 2/3` ;
- covariables : `(2, (4,3,2), 23, 5, 1, (1,2,2,2,3,3))`.

Classe fortement couplable :

`(0,0,0,1,0,1,2,1,2)`

avec

`C_profile = (44/729, 308/2187, 13460/59049)`.

Classe non couplable dans les trois horizons :

`(0,0,0,1,1,2,1,2,1)`

avec

`C_profile = (0,0,0)`.

**Observation exacte :** les résumés statiques déclarés ne déterminent donc pas le profil dynamique de cette famille de termes miroir.

Cela ne prouve pas que la différence restante soit un invariant intrinsèque de couplabilité ; elle peut dépendre de structures non incluses dans les covariables ou de la famille de protocoles choisie.

## Distribution de la profondeur statique

Parmi les `3192` classes chirales :

- `d_chi = 1` : `2462` ;
- `d_chi = 3` : `678` ;
- `d_chi = inf` dans la grammaire statique gelée : `52` ;
- `d_chi = 2` : aucune classe.

Distribution de `A_chi` :

- `0` : `52` ;
- `1/3` : `1356` ;
- `2/3` : `1486` ;
- `1` : `298`.

La grammaire statique locale est donc elle-même très souvent discriminante ; sa valeur non nulle n'est pas rare.

## Profil dynamique exact

### Horizon 3

- `89` valeurs distinctes de `C_3` ;
- `686` classes chirales ont `C_3 = 0` ;
- maximum `C_3 = 40/81` ;
- `1298` classes ont `C_3 >= 1/27`.

### Horizon 4

- `344` valeurs distinctes de `C_4` ;
- `412` classes ont `C_4 = 0` ;
- maximum `C_4 = 3124/6561` ;
- `1648` classes ont `C_4 >= 1/27`.

### Horizon 5

- `804` valeurs distinctes de `C_5` ;
- `362` classes ont `C_5 = 0` ;
- maximum `C_5 = 424/729` ;
- `1882` classes ont `C_5 >= 1/27`.

## Profondeur dynamique de révélation

- `h_chi = 3` : `2506` classes ;
- `h_chi = 4` : `274` ;
- `h_chi = 5` : `50` ;
- aucun couplage détecté jusqu'à l'horizon 5 : `362`.

**Observation :** il existe donc des réponses retardées au sens préenregistré : certaines classes silencieuses au premier horizon deviennent non nulles à 4 ou 5 feuilles.

Ne pas appeler automatiquement cette apparition tardive « amplification » : elle peut provenir d'un couplage d'ordre supérieur.

## Relation grossière entre lisibilité et couplabilité forte

Table de contingence exacte :

- `d_chi=1` : `1378` fortes, `1084` non fortes ;
- `d_chi=3` : `294` fortes, `384` non fortes ;
- `d_chi=inf` : `18` fortes, `34` non fortes.

Cette table est descriptive. Le préenregistrement n'autorisait pas à transformer a posteriori sa forme en nouveau test confirmatoire.

## Décision scientifique bornée

### Affaibli

La proposition spécifique « la chiralité structurelle est fréquente mais la couplabilité forte est rare » est **affaiblie / renversée pour ce protocole d'ordre 3** : la réponse forte dépasse largement le plafond préenregistré de `25 %`.

### Conservé

Le résultat conserve une distinction utile entre lisibilité statique et accessibilité dynamique protocolaire : des classes exactement appariées sur tous les résumés statiques déclarés peuvent avoir des profils miroir radicalement différents.

### Non établi

Ne sont pas établis :

- un invariant intrinsèque de couplabilité ;
- une dynamique physique ;
- une orientation macroscopique ;
- une amplification collective ;
- une émergence du temps ;
- une généralisation au-delà de l'ordre 3 ou de l'indice de collision.

## Prochain test discriminant

Ne pas ajuster le seuil `1/27` ni modifier rétroactivement H1.

Le prochain test doit utiliser **une seconde famille neutre indépendante**, préenregistrée avant calcul, qui ne soit pas une simple autre fonctionnelle des mêmes distributions de termes miroir. Elle doit permettre de demander si les 42 séparations statiquement appariées transportent leur contraste vers un autre protocole.

Une réplication d'ordre 4 ne doit être ouverte qu'après gel indépendant de la sous-population ou de l'échantillon et des règles dynamiques.
