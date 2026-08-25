# Préparation interne de la matrice `F0`

Date : 2026-08-25

## Résultat

La convention de matching des quatre fonds est désormais explicite et le
pipeline associé passe cinq tests : matching de densité et d'énergie moyenne,
conservation sous map FOW commun, identité FOW/ZOW, refus d'un map non
conservatif et refus d'un maillage incapable de représenter le moment avec une
température positive.

Le matching est effectué avant l'opérateur FOW, par cellule `(r,pitch)`. Ainsi,
une comparaison future ne supprimera pas par construction une interaction
possible entre forme énergétique et déplacement d'orbite.

## Nature du résultat

Les données de test sont synthétiques et explicitement non physiques. Elles
vérifient la chaîne de calcul, pas une distribution alpha, un TAE, une boucle
alpha–TAE–zonal flow ou une performance de réacteur. La portée est donc
**pipeline_verified** / interne au modèle seulement.

## Goulots non levés

Il manque toujours une entrée alpha traçable sur équilibre fixé et un solveur
TAE global contrôlé. Sans ces deux objets, le pipeline ne produit aucun score
de stabilité ni aucune conclusion de physique.
