# État courant

Dernière mise à jour : 2026-08-25 — convention de matching préparée

## Statut

Ouvert. Aucune sortie `Falpha(r,E,pitch)`, aucun solveur exécuté et aucune
comparaison de stabilité n’est disponible.

La convention de matching de la matrice est préparée et vérifiée sur un jeu
synthétique de pipeline : la Maxwellienne est ajustée par cellule source
`(r,pitch)` en densité et énergie moyenne, puis le même opérateur FOW déclaré
est appliqué aux fonds SD et M. Les invariants de moments, conservation et
refus d'entrées non représentables passent. Ce résultat ne valide ni la
physique de l'entrée, ni la stabilité TAE.

## Prochaine décision

Identifier une source traçable de distribution alpha sur équilibre fixe et un
solveur TAE global contrôlé, puis appliquer la convention déjà préparée aux
quatre fonds `F0`. Sans ces objets, aucune comparaison physique ne doit être
produite.
