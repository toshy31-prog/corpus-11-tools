# CCT-EXEC 1.8 candidate — présence effective du pont

Trois candidats ont été considérés pour ne pas confondre séparation déclarée et
indépendance utilisable : des déclarations croisées, une preuve de propriété,
et un exercice borné des voies. La troisième option est retenue car elle peut
changer l'admissibilité sans prétendre établir une indépendance de fait.

La candidate distingue `declared_only`, `partially_exercised` et
`locally_exercised_candidate`. Pour ce dernier statut, chaque voie et chaque
recours du pont 1.7 doit avoir répondu dans un exercice, et les témoins ne
peuvent être ni les contrôleurs ni les domaines de panne déclarés. Le statut ne
vaut ni mandat, ni déploiement, ni effet ; il rend seulement une continuation
locale sélectionnable plutôt qu'imaginée.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```
