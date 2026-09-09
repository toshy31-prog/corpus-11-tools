# CCT-EXEC 10.22 — recalcul du quorum après contestation confirmée

## Lacune fermée

10.21 pouvait confirmer une contestation sans appliquer la valeur reconnue au
profil ni recalculer les centres de contrôle.

## Gain concret

Chaque grief confirmé modifie la dimension exactement signée, puis toutes les
composantes de contrôle sont recalculées. Si deux domaines convergent vers une
même racine, le quorum devient inéligible et l’action requise est sa suspension.
Un grief rejeté ne modifie rien.

La couche produit une décision exécutable pour le système candidat ; elle ne
prétend pas que la suspension institutionnelle a réellement eu lieu.

## Condition de retrait

Retirer cette couche si un verdict confirmé reste sans effet, modifie une autre
dimension, ou conserve un quorum dont les centres se sont effondrés.
