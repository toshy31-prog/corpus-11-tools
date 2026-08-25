# Comptabilité synthétique de deux protocoles

## Construit et portée

Le protocole vérifie la chaîne de comptage d’unités déclarées : temps de
simulation, appels, jetons simulés et décision explicitement changée. Il ne
mesure ni énergie matérielle réelle ni coût monétaire effectif.

## Générateur et invariants

Deux journaux synthétiques appariés contiennent la même question et une seule
décision. Le calcul conserve chaque unité, refuse les dénominateurs nuls et ne
compose pas les dimensions en un score unique.

## Contrôles, effet de méthode et retrait

Le fixture produit par construction les traces qu’il mesure ; la validité est
donc limitée au pipeline d’agrégation. Retirer le calcul si une télémétrie
réelle exige des unités ou porteurs de charge absents.
