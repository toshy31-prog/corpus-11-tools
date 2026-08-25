# Comparaison synthétique d’allocation portefeuille

## Construit et portée

Le modèle compare une allocation uniforme et une allocation qui conserve une
option de test discriminant. Il produit une valeur attendue à l’intérieur des
probabilités et gains définis, sans recommander une allocation réelle.

## Invariants et retrait

Les branches, probabilités et gains sont déclarés dans le fixture. Les options
non observées restent distinctes des gains réalisés. Réviser le modèle lorsque
des historiques de décisions révèlent des dépendances, retards ou coûts absents.
