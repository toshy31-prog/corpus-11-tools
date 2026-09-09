# CCT-EXEC 10.30 — réobservation par capture runtime locale

## Lacune fermée

Toutes les paires de 10.29 restaient des objets synthétiques jamais exécutés.

## Gain concret

La paire `direct/startup` est désormais rejouée dans un module Node local.
Le module tente réellement le quorum désactivé et émet une capture JSON. Le
vérificateur recalcule le hash du harnais, compare les propriétés attendues et
lie la capture à la version Node, la plateforme et l’architecture.

C’est une réobservation locale reproductible, sans isolation de processus, pas
une observation d’un runtime déployé. Les onze autres paires restent synthétiques.

## Condition de retrait

Retirer cette couche si un harnais modifié, une cible substituée, une exécution
échouée ou une capture divergente conserve l’admission.
