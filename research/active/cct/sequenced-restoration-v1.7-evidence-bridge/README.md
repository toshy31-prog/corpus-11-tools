# CCT-EXEC 1.7 candidate — pont de continuité probatoire

La candidate 1.6 rendait explicitement visible une incapacité : quand les
preuves de réparation sont contestées, aucune action partielle ne peut être
acceptée si plusieurs dettes restent ouvertes. Cette couche ajoute une option
exécutable, sans desserrer cette protection : un pont n'est admissible que si
ses voies de continuité couvrent collectivement chaque dette ouverte et ne
partagent ni contrôleur, ni domaine de panne, ni voie de recours.

Le pont ne ferme aucune dette et ne confirme aucune preuve. Il préserve une
continuité et des recours pendant l'instruction ; les reçus indépendants de
1.5 restent nécessaires pour la clôture. Une voie centralisée, même si elle
déclare couvrir les deux axes, est refusée.

Le gain est donc local et vérifiable : la 1.6 pouvait seulement refuser le cas
à deux dettes ; la 1.7 sélectionne une continuation à double protection avec
des dépendances explicitement séparées. Cela ne prouve ni l'indépendance réelle
des acteurs, ni la disponibilité de ces voies, ni un effet institutionnel.

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```

Statut : `written_and_locally_tested_candidate`; elle ne modifie pas le gel
CCT-EXEC 1.4.
