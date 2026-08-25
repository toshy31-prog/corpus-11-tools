# Matrice `F0` et TAE global

## Rattachement et séparation

Cette extension met en œuvre le prochain test discriminant de la recherche
alpha–TAE–zonal flow. Elle ne réexécute pas les écrans analytiques à faible
fidélité et ne prétend pas résoudre la fusion.

## Objet

Établir une chaîne vérifiable : distribution alpha fournie pour un équilibre
fixe → construction de quatre fonds `F0` → même solveur TAE global, profils et
mode gelés → drive résonant intégré et comparaison bornée.

## Matrice minimale

| Forme du fond | Représentation |
| --- | --- |
| ralentissement (SD) | ZOW |
| Maxwellienne canonique appariée | ZOW |
| ralentissement (SD) | FOW |
| Maxwellienne canonique appariée | FOW |

La règle d’appariement canonique, notamment pour la cellule FOW de la
Maxwellienne, doit être déclarée avant toute sortie.

## Convention préparée

La règle est maintenant fixée dans
[`matching-contract.md`](matching-contract.md) : la Maxwellienne est appariée
en densité et énergie moyenne dans chaque cellule source `(r,pitch)`, puis le
même opérateur FOW déclaré est appliqué à SD et M. Le pipeline et ses invariants
sont dans [`pipeline/`](pipeline/). Cette préparation est interne au modèle et
ne remplace aucune entrée alpha ni aucun solveur.

## Préconditions

- une distribution `Falpha(r,E,pitch)` ou une sortie équivalente traçable, rattachée à un équilibre déterminé ;
- un solveur global disponible et les conventions de mode/profil documentées ;
- tests de conservation, de convergence et de reproductibilité avant la comparaison physique ;
- séparation entre résultat de stabilité, transport, gain et portée réacteur.

## Décision et arrêt

Le dossier décide seulement s’il est justifié de consacrer du calcul à cette
matrice. Il s’arrête si l’entrée alpha ou le solveur contrôlé restent
inaccessibles ; dans ce cas, aucun raffinement d’écran léger ne compte comme substitut.

Voir [`state/current_state.md`](state/current_state.md).
