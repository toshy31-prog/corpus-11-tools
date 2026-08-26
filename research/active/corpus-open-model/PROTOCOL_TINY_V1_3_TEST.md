# Ouverture unique du test — TinyDoctrineEncoder v1.3

## Sélection préalable observée

Le run v1.3 a été fixé à 1 000 pas avec validation tous les 200 pas. La perte
validation a atteint son minimum au pas 800 (`8,3463`) avant de remonter au pas
1 000 (`8,6788`) tandis que la perte train continuait de décroître. Le
checkpoint `v1.3-best.pt`, correspondant au pas 800, est donc sélectionné sans
utiliser le test.

## Test autorisé

Le script `evaluate_tiny_doctrine_test.py` charge uniquement ce checkpoint et
les 78 documents du partition `test`. Son résultat rend ce test observé : il
ne devra plus servir à choisir un taux d'apprentissage, une architecture ou un
nombre de pas pour v1.3.

## Interprétation

La perte MLM sur test mesure la capacité à prédire des tokens masqués dans des
documents Corpus non vus. Elle ne mesure ni le routage de capabilities, ni la
qualité d'une analyse, ni la validité de la doctrine.
