# Sélection locale — EcologicalTinyEncoder v1.4

## État validé

- patch inscrit : oui, sous `research/active/corpus-open-model/` uniquement ;
- compilateur inspecté : oui, 964 documents et frontières statutaires
  présentes ;
- entraînement local : oui, 1 000 pas ;
- sélection validation : oui, pas 800, perte `8,2143` ;
- test v1.4 : observé une fois, perte MLM `8,4223` sur 90 documents ;
- déploiement produit : non autorisé et non effectué.

La hausse à `8,5414` au pas 1 000 après le minimum de validation justifie de
retenir le checkpoint du pas 800 plutôt que le dernier checkpoint.

## Conclusion bornée

Il existe un checkpoint local v1.4 sélectionné par validation sur une
représentation qui inclut des signaux structurels déclarés. Aucune comparaison
directe avec v1.3 n’est justifiée par les pertes de validation, car les
partitions diffèrent. Aucun gain de capacité Corpus, aucune autonomie et aucun
effet hors de ce protocole ne sont établis.

Le test v1.4 n’inclut aucun document avec relation déclarée (`0/90`). Il ne
peut donc pas départager « le contexte relationnel apporte quelque chose » de
« le contexte relationnel n’apporte rien ». Le prochain protocole, s’il est
autorisé comme une nouvelle variante, devra réserver à l’avance des documents
avec et sans relations déclarées dans chaque partition.
