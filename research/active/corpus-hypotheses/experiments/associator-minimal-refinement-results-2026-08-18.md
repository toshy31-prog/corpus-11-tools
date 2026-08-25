# Résultats — raffinement minimal par l'associateur

Date : 2026-08-18

Préenregistrement : `associator-minimal-refinement-preregistration-2026-08-18.md`

Script : `run_associator_minimal_refinement_order3.py`

## Contrôles

PASS :

- `3 330` classes d'isomorphisme reproduites ;
- `3 192` classes chirales reproduites ;
- signatures `A1..A4` invariantes sous les six renommages ;
- signatures utilisées invariantes sous opposition ;
- profils P1/P2 identiques sous opposition ;
- arithmétique exacte pour P1/P2.

## Résidus cumulés

Chaque tuple est `(nombre de cellules, cellules résiduelles R, taille maximale d'une cellule résiduelle, membres dans cellules résiduelles)`.

### I2 seul

- P1 : `(1582, 7, 6, 30)`
- P2 : `(1582, 2, 4, 8)`
- joint `(P1,P2)` : `(1582, 7, 6, 30)`

### I2 + A1

- P1 : `(1582, 7, 6, 30)`
- P2 : `(1582, 2, 4, 8)`
- joint : `(1582, 7, 6, 30)`

`A1` n'ajoute aucune séparation. Ce résultat est attendu rétrospectivement : `I0`, inclus dans `I2`, contient déjà le nombre exact de triplets associatifs ; `A1 = 27 - nombre_associatif` est donc redondant.

### I2 + A1 + A2

- P1 : `(1590, 0, 0, 0)`
- P2 : `(1590, 0, 0, 0)`
- joint : `(1590, 0, 0, 0)`

**Premier niveau suffisant.**

`A2` est l'histogramme canonique, sous renommage et opposition, des couples de sortie

`((a*b)*c, a*(b*c))`

sur les 27 triplets ordonnés.

### I2 + A1 + A2 + A3

Contrôle plus riche :

- `1592` cellules ;
- aucun résidu P1, P2 ou joint.

### I2 + A1 + A2 + A3 + A4

Borne descriptive complète :

- `1596` cellules ;
- aucun résidu P1, P2 ou joint.

Ce dernier niveau sépare les `1596` paires chirales `M/M^op`, mais il n'est pas nécessaire pour déterminer P1/P2.

## Classification

**Minimal sufficient refinement : `I2 + A2`** (`A1` étant déjà redondant avec `I0`).

La structure par orbites `S3` des entrées (`A3`) n'est pas nécessaire. La table canonique complète du défaut (`A4`) n'est pas nécessaire.

## Conclusion bornée

Pour les deux protocoles P1/P2 et la population complète des magmas chiraux d'ordre 3 :

- les invariants de translations et de semigroupes `I2` laissent encore 7 cellules P1 et 2 cellules P2 ambiguës ;
- le simple histogramme global canonique des couples de sorties de l'associateur suffit à supprimer tous ces résidus ;
- aucune information sur l'emplacement précis des triplets dans leurs orbites sous permutation d'entrées n'est nécessaire pour P1/P2.

Ainsi, une formulation exacte et compacte est :

> **P1 et P2 sont déterminés, à l'ordre 3, par une compression statique formée de `I2` et de l'histogramme canonique des couples de sorties du défaut d'associativité.**

Cela n'est pas un théorème sur toutes les dynamiques neutres possibles.

## Fermeture scientifique

H1 reste `too_common`.

H2 reste `not_transported` / `no_predictive_transport`.

H3 reste `standard_absorption`, désormais avec un absorbeur minimal plus précis : `I2 + A2`.

La voie expérimentale P1/P2 à l'ordre 3 est fermée. Aucun protocole dynamique P3 ne doit être ajouté pour rechercher adaptativement un succès.

Une réouverture éventuelle exige une prédiction indépendante formulée sans utiliser les sorties d'une nouvelle sonde.