# Résultats — transport hors protocole du contraste chiral

Date : 2026-08-18

Préenregistrement : `chiral-transport-preregistration-2026-08-18.md`

Script : `run_chiral_transport_order3.py`

## Contrôles

Tous les contrôles exacts passent :

- `3 330` classes d'isomorphisme réénumérées ;
- `3 192` classes chirales ;
- exactement `42` strates statiques gelées retrouvées ;
- toute classe auto-opposée a un profil protocole 2 nul ;
- passage à l'opposé : inversion exacte des vecteurs signés de rang ;
- renommage `0 <-> 1` : profil protocole 2 inchangé ;
- fréquences calculées en fractions rationnelles exactes.

## Résultat confirmatoire H2

Le protocole 2 utilise des chaînes de translations composées et les distributions de rang de ces applications. Il n'utilise ni arbres binaires miroir ni indice de collision du protocole 1.

Sur les 42 strates gelées :

- `Delta_S^(2) > 0` : **14** ;
- `Delta_S^(2) = 0` : **11** ;
- `Delta_S^(2) < 0` : **17** ;
- médiane exacte des 42 contrastes : **0**.

La règle gelée exigeait au moins 28 contrastes positifs et une médiane positive pour `transported`.

**Classification du contraste : `not_transported`.**

## Contrôle prédictif hors protocole

La règle gelée utilisait uniquement

`P1_score = C_3^(1)+C_4^(1)+C_5^(1)`

pour prédire, à l'intérieur de chaque strate, quelle extrémité aurait le plus grand `B^(2)`.

Résultat :

- succès stricts : **11** ;
- égalités : **14** ;
- échecs : **17**.

Le seuil gelé était 28 succès stricts.

**Classification prédictive : `no_predictive_transport`.**

## Issue globale

Les deux conditions de H2 échouent.

**OUTCOME : `not_transported`.**

Le contraste fort/faible du protocole 1 ne se transporte donc pas, selon les critères préenregistrés, vers cette seconde sonde indépendante.

## Informations descriptives secondaires

Parmi les 3 192 classes chirales :

- **2 942** ont au moins une réponse protocole 2 non nulle aux horizons 2–4 ;
- les classes chirales réalisent **292 profils** `C_profile^(2)` distincts.

Ainsi, l'échec de transport n'est pas dû à une sonde protocole 2 presque partout nulle. La seconde famille voit largement des asymétries gauche/droite, mais pas selon la partition découverte par le protocole 1.

## Interprétation bornée

### Observation

La partition issue des arbres miroir et de l'indice de collision ne possède pas de transport confirmatoire vers les distributions de rang des chaînes de translations.

### Inférence autorisée

Le premier profil `C^(1)` doit être traité comme fortement dépendant du protocole tant qu'une autre famille indépendante ne montre pas de stabilité. Les 42 strates établissaient seulement que les descripteurs statiques déclarés n'épuisaient pas le protocole 1 ; elles n'établissaient pas une propriété intrinsèque manquante.

### Ce qui n'est pas démontré

L'expérience ne démontre pas :

- que toute notion de couplabilité intrinsèque est impossible ;
- que toute dynamique compositionnelle est incapable de produire une orientation ;
- que les 42 strates ne cachent aucun invariant statique non mesuré ;
- une émergence ou une absence d'émergence physique du temps.

## Effet sur l'hypothèse 2

Deux résultats confirmatoires successifs sont maintenant défavorables à la narration forte :

1. protocole 1 : la forte réponse n'est pas rare (`52,94 %`, `too_common`) ;
2. protocole 2 : la partition du protocole 1 ne transporte ni contraste global ni prédiction (`not_transported`).

Cela justifie d'affaiblir davantage l'idée que la non-auto-opposition des petits magmas fournit naturellement une structure privilégiée de transduction orientée.

La question plus faible reste ouverte : certaines familles dynamiques pourraient présenter des asymétries compositionnelles utiles, mais elles doivent désormais montrer une stabilité hors protocole avant toute lecture intrinsèque.

## Prochaine action

Ne pas chercher immédiatement un protocole 3 jusqu'à obtenir un succès. Cette stratégie serait adaptative.

Avant toute nouvelle dynamique, effectuer un audit explicatif des deux protocoles déjà gelés : identifier quelles propriétés statiques standards déterminent ou prédisent `C^(1)` et `C^(2)`, puis décider si une nouvelle expérience possède une valeur discriminante indépendante. L'ordre 4 reste fermé pour la revendication forte tant que cette analyse n'est pas faite.
