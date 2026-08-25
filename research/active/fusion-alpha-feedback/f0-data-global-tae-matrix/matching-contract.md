# Convention de matching des quatre fonds `F0`

## Statut et portée

Cette convention fige la préparation de la matrice
`{SD, Maxwellienne} × {ZOW, FOW}`. Elle est vérifiée sur un jeu synthétique de
pipeline, donc au niveau **pipeline_verified** seulement. Elle ne constitue ni
une distribution alpha réelle, ni un équilibre, ni un calcul de stabilité.

## Entrée qui sera exigée

Avant tout calcul TAE, l'entrée devra fournir, pour un équilibre identifié et
traçable :

- `Falpha(r,E,pitch)` avec unités, grille, normalisation, conventions de pitch
  et de coordonnées ;
- la mesure de quadrature ayant converti les valeurs échantillonnées en masses
  de cellules énergie–pitch ;
- l'empreinte et la provenance de la sortie ;
- l'équilibre, les profils et le mode associés ;
- l'opérateur FOW réellement utilisé par le solveur, avec sa convention de
  conservation et ses limites d'interpolation.

En l'absence de ces éléments, seules les vérifications de code et de format
sont autorisées.

## Construction gelée

Noter `O` l'opérateur d'orbite explicite, appliqué sur les coordonnées
radiales à énergie et pitch donnés.

| Fond | ZOW | FOW |
| --- | --- | --- |
| ralentissement (SD) | `F_SD(r,E,pitch)` fourni | `O⟨F_SD⟩` |
| Maxwellienne canonique (M) | `M⟨F_SD⟩(r,E,pitch)` | `O⟨M⟨F_SD⟩⟩` |

`M⟨F_SD⟩` est ajustée **en coordonnées source**, dans chaque cellule
`(r,pitch)`, pour conserver exactement la densité discrète et l'énergie moyenne
de cette cellule. Sa forme énergétique est la Maxwellienne discrète
proportionnelle à `sqrt(E) exp(-E/T)` avec température positive. Le pipeline
refuse un maillage énergétique qui ne permettrait pas ce matching, au lieu de
modifier silencieusement le moment cible.

Le code reçoit des **masses de cellules énergie–pitch**, non de simples valeurs
ponctuelles de `F`. Toute quadrature (largeur de bin, jacobien, mesure de
pitch) doit donc être appliquée et conservée dans la provenance avant l'appel.
Sans cette conversion, les moments internes seraient seulement ceux d'un
maillage arbitraire.

Le matching intervient avant `O` et `O` est le même opérateur déclaré pour SD
et M. Il n'y a pas de ré-appariement après le déplacement FOW : cette opération
effacerait par construction une différence éventuelle entre forme énergétique
et orbite.

## Invariants contrôlés

- énergies strictement positives et croissantes ;
- densité strictement positive dans chaque cellule source ;
- conservation de densité et d'énergie moyenne par cellule SD/M en ZOW ;
- map FOW non négatif et à colonnes conservatrices, pour chaque `(pitch,E)` ;
- conservation de densité totale sous `O` pour SD comme M ;
- identité de `FOW` et `ZOW` lorsqu'un opérateur identité est fourni ;
- empreintes de l'entrée, de la grille et de l'opérateur conservées dans les
  métadonnées de sortie.

## Ce que ces contrôles ne détectent pas

Ils ne détectent pas la qualité physique de `Falpha`, les collisions, la
géométrie, les particules piégées, la normalisation d'un solveur, le drive
résonant, un taux de croissance, la saturation, le transport ou le gain d'un
réacteur. Un map synthétique qui passe les invariants ne peut pas remplacer un
opérateur de centre-guide ou un calcul gyrocinétique.

## Condition de retrait ou de révision

Réviser la convention si le solveur choisi impose une représentation de pitch,
une normalisation ou un opérateur FOW incompatible avec le matching
source-coordinate, ou si un test de conservation/convergence sur l'entrée
réelle échoue. Aucune sortie actuelle ne permet de choisir entre ces cas.
