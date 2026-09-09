# CCT-EXEC 10.31 — réobservation locale de la matrice complète

## Lacune fermée

10.30 n’exécutait localement que la cellule `direct/startup` ; onze paires
restaient purement synthétiques.

## Gain concret

Le harnais local calcule et tente désormais les douze combinaisons classes ×
fenêtres. Chaque sortie est comparée cellule par cellule aux propriétés
préengagées et au blocage du quorum. Une cellule absente ou plus facile à
bloquer invalide le statut « matrice complète ».

La réobservation couvre un module local dans le même processus. Elle n’établit
ni isolation, ni runtime déployé, ni transport entre environnements.

## Condition de retrait

Retirer cette couche si une cellule manquante ou divergente conserve la
réobservation complète, ou si cette exécution locale est décrite comme déployée.
