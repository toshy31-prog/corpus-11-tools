# État courant

Dernière mise à jour : 2026-08-25 — matrice fictive v1/v2 exécutée

## Statut

La convention de matching est vérifiée avec provenance complète des grilles,
unités et quadrature. Une distribution alpha fictive et un solveur linéaire
fictif ont ensuite exercé les quatre fonds sous trois noyaux et trois niveaux
de grille.

La v1 est conservée comme échec de méthode `inconclusive_refinement` : son
déplacement adjacent dépendait du pas radial. La v2, déclarée séparément,
remplace seulement cette opération par un déplacement radial physique interpolé
et conservatif; une comparaison canonique verrouille les autres paramètres.
`mid_signed` et `broad_gradient` gardent une interaction non nulle avec
variations fine→référence de `0.191800` et `0.181021`; `core_low` ne passe pas le
seuil (`0.370200`). Le niveau coarse n'entre pas dans ce critère : ses variations
vers fine pour les deux noyaux retenus sont `0.230280` et `0.245915`, au-dessus
de `0.2`. Le verdict est donc borné aux deux niveaux les plus fins. Le statut
`fixed_before_execution` est auto-déclaré, sans verrou temporel indépendant.
Verdict :
`shape_orbit_interaction_model_internal`.

Tous les contrôles passent. Ce résultat ne valide ni une distribution alpha
matérielle, ni un mode TAE, ni une stabilité.

## Prochaine décision

Arrêt local pour cette passe. Ne pas ajuster `core_low` ni le seuil après
résultat. Une réouverture interne exige une nouvelle famille fictive et un
noyau fixé indépendamment, capable de renverser la classification v2. Aucun
objet extérieur n'est une prochaine dépendance.
