# État courant

Dernière mise à jour : 2026-08-25

## Statut

`weakened`. Les trois séquences initiales restent `model_internal`, mais la
politique `tombstone_wins` n’est pas confluente dans l’implémentation : 12 des
162 couples état–source–politique dépendent uniquement de l’ordre des cibles.
La projection observée est une présence de payload logique, jamais physique.

## Prochaine action interne utile

Versionner une sémantique atomique de synchronisation comme modèle rival, puis
comparer les deux sémantiques sur le même espace fini. Retirer toute propriété
de politique qui ne survit pas à ce contraste.
