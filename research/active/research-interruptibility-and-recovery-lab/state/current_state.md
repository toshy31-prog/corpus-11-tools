# État courant

L’ancienne égalité snapshot/restored est `weakened` : elle ne testait aucun
mécanisme de reprise. Le pipeline généré récupère exactement à 4/4 coupures
lorsque la dépendance d’exécution est sérialisée. Son omission change les hashes
et la décision. Portée `pipeline_verified`.

## Prochaine action interne utile

Ajouter checkpoints partiels, corruption de journal et ordres de reprise
rivaux ; conserver la première dépendance omise comme condition de retrait.
