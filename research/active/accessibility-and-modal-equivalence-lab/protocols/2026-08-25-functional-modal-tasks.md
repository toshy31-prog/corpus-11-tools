# Protocole fixé avant exécution — tâches modales fonctionnelles

## Portée et générateur

`pipeline_verified`. Trois canaux fictifs exposent les mêmes identifiants mais
des transformations, budgets d’étapes et seuils distincts.

## Paramètres, invariants et contrôles

La tâche nécessite l'exécution de l'action exacte, la conservation de la preuve
exacte et l'accès au recours exact, sous budget d'étapes et seuil de charge.
`success` est la conjonction de ces cinq opérations vérifiées; il n'est pas
déduit de la seule absence d'un motif pré-écrit. Texte : aucun défaut ; voix :
perte de preuve ; contraint : budget de deux étapes. Les contrôles de réparation
retirent la perte vocale ou ajoutent un raccourci sans changer l’objectif. Trois
mutations unitaires et une mutation combinée retirent action, preuve ou recours.

## Effet et retrait

Le simulateur définit coûts, opérations et pertes ; il vérifie seulement la
chaîne de pipeline fictive. Retirer la conclusion si une action interdite, une
preuve absente ou un recours absent réussit, si un seuil est modifié après
exécution ou si une réparation réussit sans restaurer action, preuve et recours.
