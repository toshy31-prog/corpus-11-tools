# CCT — campagne fictive appariée D10

Date : 2026-08-25

## Effet observé dans le modèle

`CCT-SC-D10-001` a traversé exhaustivement les 32 combinaisons de deux niveaux
de charge, canal, rythme, perturbation et environnement. D10 et le routage
simple ont reçu chaque monde identique. Les cinq portes ainsi que les charges
visible, cachée et perdue ont été conservées séparément.

Dans la variation de base, D10 ne perd aucune porte, sa trace et sa restitution
restent utilisables dans `32/32` mondes, et le comparateur ne le renverse dans
aucun monde selon les conditions fixées. Une variation préfixée diminue la
contestabilité D10 de `0,22` : la trace devient inutilisable dans `24/32` mondes
et la classification mécanique devient `reversal_triggered`.

## Conclusion et portée

La conclusion la plus forte est une survie interne dépendante du protocole.
Elle ne valide ni D10, ni CCT, ni un effet institutionnel. Les coefficients,
seuils, équations et mondes sont des primitives déclarées du modèle et peuvent
produire l'effet. La prochaine action interne est une cartographie analytique
du seuil de contestabilité, avec modèle rival continu seulement si celui-ci
peut changer la classification.

Résultats détaillés :
[`field-calibration/results/cct-sc-d10-001/`](../field-calibration/results/cct-sc-d10-001/).
