# Écran léger M vs slowing-down

## Statut

Calcul analytique isotrope et apparié en moments. Il ne simule ni TAE, ni tokamak, ni réacteur.

## Résultat reproductible

- domaine : c=[0.050, 0.950], s=[0.050, 0.950]
- points de grille : 289
- ratio minimal : 0.013808 à c=0.950, s=0.050
- ratio maximal : 738.95 à c=0.050, s=0.050
- points avec écart local d'au moins un facteur deux : 129/289

## Conclusion bornée

La sortie mesure une non-équivalence locale de pente, pas le signe d'un gain alpha. Elle peut justifier ou non un calcul cinétique complet, mais ne le remplace pas.
