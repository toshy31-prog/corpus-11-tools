# Matrice F0–TAE fictive — résultats v1 et v2

## Correction préalable de provenance

Le pipeline exige désormais les grilles radiale, pitch et énergie, les unités,
les poids de quadrature et la déclaration `cell_mass`. Chacun de ces objets est
empreinté séparément. Les valeurs ponctuelles sans quadrature sont refusées.

## Version 1 — résultat négatif conservé

`F0-TAE-FICT-001` applique un transfert vers la cellule adjacente. Les trois
interactions sont non nulles, mais aucune ne respecte le seuil de raffinement :
variations fine→référence `0.267663`, `0.616849` et `0.576311`. Verdict :
`inconclusive_refinement`.

L'audit identifie l'effet de méthode : la distance physique représentée par
une cellule diminue avec le raffinement. La v1 n'est ni supprimée ni réécrite.

## Version 2 — correction distincte

`F0-TAE-FICT-002` conserve source continue, grilles, noyaux, rivaux et seuils.
Elle change seulement l'opérateur : déplacement fixé en rayon normalisé, puis
interpolation linéaire conservative. Une comparaison canonique exécutable
verrouille désormais tous les champs non propres à l'opérateur, notamment la
décision. Le statut « fixé avant exécution » reste une déclaration des fichiers,
sans verrou temporel indépendant.

- `core_low` : interaction non nulle mais variation `0.370200`, non stable ;
- `mid_signed` : variation `0.191800`, stable ;
- `broad_gradient` : variation `0.181021`, stable.

Verdict : `shape_orbit_interaction_model_internal`, car deux noyaux sur trois
passent la règle fine→référence déclarée pour v2. Coarse est diagnostique : les
variations coarse→fine correspondantes (`0.230280`, `0.245915`) excèdent `0.2`
et ne sont pas utilisées par cette règle. Identité, noyau uniforme, noyau de
moments, matching, conservation, linéarité, provenance et reconstruction passent
sans échec.

## Portée et arrêt

La v2 montre seulement que, dans cette famille et cette fonctionnelle
linéaire, l'opérateur orbital change le contraste SD/M. Elle ne calcule aucun
taux de croissance ou seuil TAE. Portées : `model_internal` et
`pipeline_verified`.

Ne pas ajuster `core_low` ni le seuil. Retirer la conclusion si un contrôle
échoue, si moins de deux noyaux restent stables lors d'une reconstruction, si
le déplacement varie avec le pas radial ou si les artefacts changent.
