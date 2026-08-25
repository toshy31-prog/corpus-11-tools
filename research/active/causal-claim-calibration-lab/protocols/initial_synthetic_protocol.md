# Cycle synthétique initial — association, intervention et confusion

## Construit et portée

Le construit est la calibration d'un verdict causal dans deux **mondes causaux
finis** dont les résultats potentiels, le confondeur et le mécanisme de tirage
du traitement sont entièrement déclarés. Le statut est `model_internal`: les
effets calculés sont vrais dans ces mondes synthétiques, pas dans une population
réelle.

## Définition opérationnelle

L'unité est une ligne synthétique munie de `C`, `X`, `Y(0)`, `Y(1)` et d'un
poids entier; le traitement est posé au temps zéro, l'issue au même horizon
unique, sans interférence entre unités. L'association est
`E[Y|X=1] - E[Y|X=0]`; l'effet d'intervention est `E[Y(1)-Y(0)]`; l'estimation
ajustée standardise par `C`. Les verdicts sont
`not_identified` pour l'association observationnelle non ajustée confondue et
`identified_under_assumptions` seulement quand le dessin ou le graphe déclaré
le rend possible dans le modèle.

## Générateur, paramètres et invariants

- Générateur : tables de résultats potentiels à poids entiers, sans aléa.
- Paramètres : distribution de `C`, affectation de `X`, résultats potentiels et
  déclaration de dessin (`observational_confounding` ou `randomized`).
- Invariants : poids positifs, les deux niveaux de traitement dans chaque
  strate, association distincte de l'effet `do`, et absence de transport hors
  de la table déclarée.

## Contrôles et effet de méthode

Le premier monde produit une association forte sans effet causal; le second
produit un effet sous affectation randomisée. Le test observe des résultats
potentiels que la plupart des études réelles ne donnent pas; il simplifie donc
précisément le problème qu'il illustre. Il n'établit ni la validité d'un proxy
réel, ni un mécanisme social ou biologique.

## Résultat qui retirerait la conclusion

Le verdict doit être retiré si les fractions calculées divergent de l'oracle,
si un verdict identifié apparaît sans hypothèses déclarées, ou si l'ajustement
sur `C` ne reproduit plus l'effet exact dans la fixture. Tout effet extérieur
requiert un graphe, des mesures et une stratégie d'identification propres au
terrain.
