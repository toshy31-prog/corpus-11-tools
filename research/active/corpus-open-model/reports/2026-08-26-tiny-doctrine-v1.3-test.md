# TinyDoctrineEncoder v1.3 — évaluation MLM finale

## Sélection

Le checkpoint au pas 800 a été choisi sur validation (`8,3463`), avant toute
lecture du test. La validation remontait ensuite au pas 1 000 ; le checkpoint
final n'a donc pas été retenu.

## Test observé

Sur 78 documents Corpus non vus (15 produit et 63 recherche, 98 407 tokens),
le checkpoint sélectionné atteint une perte MLM de **8,1179**.

| Partition | Perte MLM |
| --- | ---: |
| validation au pas 800 | 8,3463 |
| test final | 8,1179 |

## Conclusion autorisée

Le petit Transformer entraîné localement apprend des régularités de tokens qui
se transportent à ce partition documentaire tenu à l'écart. Cette affirmation
reste limitée au MLM, à ce corpus, à ce split et à ce checkpoint. Elle ne
démontre ni compréhension doctrinale, ni routage de capabilities, ni qualité
d'analyse.

Le test v1.3 est désormais observé et ne doit plus guider aucun réglage de
cette variante.
