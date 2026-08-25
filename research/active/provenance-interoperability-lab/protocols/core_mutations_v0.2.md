# Mutations du noyau de provenance v0.2

Le protocole a été fixé avant exécution. Sa portée est `pipeline_verified`.

Le générateur mute tour à tour chacun des quinze scalaires du noyau déclaré,
désormais `receipt_id` et attribution compris, sérialise réellement le document
en JSON et exécute deux profils locaux. Les invariants sont l'identité exacte du
noyau, la détectabilité de chaque mutation et un registre explicite pour la
seule note hors noyau.

Les contrôles couvrent deux formes d'encodage, l'identifiant du reçu et chaque
champ de conclusion, source, transformation et retrait. Les deux adaptateurs partagent encore le
même dépôt et ne démontrent aucune conformité à un format extérieur. Retirer
le résultat si une mutation du noyau devient indétectable ou si une extension
est perdue sans registre.
