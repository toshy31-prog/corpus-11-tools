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

L'API exige et empreinte désormais les grilles radiale, pitch et énergie, les
unités et la quadrature déclarée `cell_mass`. Elle ne peut plus accepter
silencieusement une forme sans provenance de maillage complète.

## Matrice fictive exécutée

Deux versions distinctes conservent la trajectoire de méthode :

- `F0-TAE-FICT-001` : `inconclusive_refinement`. Son opérateur envoyait une
  probabilité vers la cellule adjacente ; le déplacement représenté se
  contractait avec le pas radial.
- `F0-TAE-FICT-002` : l'unique correction est un déplacement fixé en unités de
  rayon, interpolé de façon conservative. Deux noyaux sur trois conservent une
  interaction SD/M × FOW non nulle sous le critère fine→référence déclaré avant
  cette seconde exécution. Le niveau coarse est seulement diagnostique. Le
  statut temporel reste une déclaration sans verrou indépendant. Verdict :
  `shape_orbit_interaction_model_internal`.

Les contrôles identité, noyau uniforme, moments affines, conservation,
linéarité, provenance et reconstruction passent. Les artefacts séparés sont
dans [`reports/fictive-tae-matrix-v0.1/`](reports/fictive-tae-matrix-v0.1/) et
[`reports/fictive-tae-matrix-v0.2/`](reports/fictive-tae-matrix-v0.2/).

## Entrées d'une éventuelle autre matrice

- une distribution fictive déclarée en masses de cellules avec quadrature ;
- un solveur fictif contrôlé et des conventions de mode/profil documentées ;
- tests de conservation, de convergence et de reproductibilité avant la comparaison physique ;
- séparation entre résultat de stabilité, transport, gain et portée réacteur.

## Décision et arrêt

Le dossier a épuisé la matrice interne actuellement fixée. Il s'arrête sur la
conclusion `model_internal` de la v2, sans convertir cette interaction fictive
en stabilité TAE. L'absence d'une entrée ou d'un solveur extérieur n'est ni une
prochaine étape ni un blocage.

Voir [`state/current_state.md`](state/current_state.md).
