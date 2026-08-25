# Campagne SCM binaire v0.2

## Protocole et portée

Le protocole a été fixé avant exécution. La conclusion est `model_internal` :
elle porte uniquement sur sept modèles causaux structurels binaires déclarés.

## Générateur, paramètres et invariants

Le générateur énumère exactement tous les états équiprobables des variables
exogènes binaires, calcule les mondes observationnels et les deux interventions
`do(X=0)` et `do(X=1)`, puis essaie tous les sous-ensembles des variables
d'ajustement observables. Les paramètres sont les équations nommées, le DAG,
les variables observables et l'étiquette de dessin. Les invariants sont : même
état exogène sous les deux interventions, oracle `do` exact, critère backdoor
calculé sur le graphe, exclusion des descendants de `X` et positivité dans
chaque strate retenue.

## Contrôles et modèles rivaux

La campagne couvre confondeur mesuré, confondeur latent, collisionneur,
médiateur, randomisation, violation de positivité et un rival qui conserve le
même SCM mais change seulement l'étiquette de dessin. Cette dernière ne peut
plus déterminer le verdict.

## Effet de méthode et retrait

Le laboratoire connaît le DAG et toutes les variables exogènes; il simplifie
donc l'identification au lieu de la mesurer hors modèle. Retirer le résultat si
un ajustement déclaré valide ne reproduit pas l'oracle exact, si un descendant
est admis, si une strate sans support est estimée, ou si changer seulement
l'étiquette modifie le verdict graph-aware.
