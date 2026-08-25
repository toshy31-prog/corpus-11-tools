# État courant

Le flag initial « ne pas inférer l’autonomie » était une garde, non une mesure.
Une première population fictive utilisait encore un proxy : `general_rule=True`
forçait le succès et le template n'était pas lu. Ce verdict est `weakened`. Le
simulateur corrigé calcule désormais les réponses, consulte le template pour la
procédure et exige deux transferts. Il produit une classe de capacité autonome
dans le modèle, une dépendance procédurale et une dépendance à l’assistance, avec
5/5 mutations discriminées. Portée `model_internal`.

## Prochaine action interne utile

Ajouter une seconde opération apprise rivale et varier la reprise retardée ;
retirer la classe autonome si elle ne survit pas à une nouvelle famille de
templates sous la même règle.
