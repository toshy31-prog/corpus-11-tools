# Résultats — robustesse du reste de factorisation dans S4

Date : 2026-08-18

Préenregistrement : `factorization-s4-permutation-preregistration-2026-08-18.md`

Script : `run_factorization_s4_permutation.py`

## Contrôles

PASS :

- 24 matrices de permutation `4 x 4` ;
- `C(24,3)=2024` triplets non ordonnés ;
- algèbre linéaire sur rationnels exacts ;
- profils marginaux et deux-à-deux traités comme multisets triés.

## Résultat confirmatoire

26 clés basses distinctes sont réalisées.

Une clé basse est discriminante :

- dimensions fixes marginales : `(3,3,3)` ;
- dimensions d'intersections deux-à-deux : `(2,2,2)`.

Cette même clé réalise deux dimensions triples :

- `D(A,B,C)=1` pour 16 triplets ;
- `D(A,B,C)=2` pour 4 triplets.

Exemples canoniques selon l'ordre d'énumération des 24 permutations :

- dimension triple `1` : indices `(1,2,6)` ;
- dimension triple `2` : indices `(1,2,5)`.

## Décision

**`transported_remainder`**.

Le phénomène « données fixes jusqu'à l'ordre deux identiques mais intersection triple différente » survit dans une seconde famille naturelle : matrices de permutation ordinaires de `S4` sur `Q^4`, sans signes ni sélection de matrices après résultat.

## Portée

Ce résultat renforce la robustesse **mathématique** du reste d'ordre trois. Il montre que le premier témoin en matrices de permutation signées de dimension 3 n'était pas nécessaire pour faire exister le phénomène.

Il n'établit pas :

- que `D_I` représente un objet physique ;
- que ces transports sont physiquement privilégiés ;
- une co-émergence avec le temps ;
- une nouvelle théorie de jauge ou de matière.

## Prochaine question discriminante

La question prioritaire devient désormais la fréquence et la stabilité du reste sous **ajout prospectif de nouvelles factorisations** : pour une famille fixée d'avance, une intersection non nulle à trois transports survit-elle à l'ajout d'un quatrième transport plus souvent que prévu par des contrôles appariés, ou s'effondre-t-elle comme une coïncidence de bas ordre ?
