# CCT-RV-01 — véhicule de ressources pour continuité vitale

## Finalité

La CCT ne propose pas un audit à un service qui manque de moyens. `CCT-RV-01`
est le candidat de véhicule qui ne peut financer qu'une **capacité matérielle
additionnelle** chez un opérateur existant : pièces et énergie de secours,
main-d'œuvre locale payée, stock de secours, accessibilité et réparation.

Le premier usage envisagé est `CCT-MIN-01 — Continuité locale de l'eau`.
L'opérateur local conserve la responsabilité du service. La CCT-RV ne prend ni
le contrôle de l'eau, ni la sélection politique des bénéficiaires, ni les données
personnelles des usagers.

Le financement peut également soutenir un vecteur du [Ciel de la CCT](../cct-sky/)
quand ce vecteur ouvre une voie indépendante — par exemple un bateau dans une
zone où les crues coupent les routes — et qu'il laisse la continuité locale plus
forte après son départ.

## Promesse utile au porteur local

L'offre n'est faite que si les fonds sont effectivement sous séquestre chez un
hébergeur légal identifié. À ce moment-là, elle apporte :

1. un budget protégé de continuité qui ne concurrence pas le fonctionnement
   ordinaire ;
2. les pièces, l'énergie de secours et le temps de maintenance que le service
   a déjà identifiés comme points de rupture ;
3. la rémunération et la protection des personnes qui maintiennent le service ;
4. un secours et une réparation financés avant l'incident ;
5. un suivi léger, payé par le véhicule, qui ne demande pas aux usagers de
   produire de la donnée nominative ni aux équipes de remplir un reporting de
   bailleur supplémentaire.

Sans ces cinq éléments, le véhicule ne se présente pas comme une aide.

## Statut actuel

`design_only_no_funds_no_legal_host`.

Il n'existe aujourd'hui ni personne morale hôte, ni fonds, ni trésorerie, ni
engagement de décaissement. Le dossier ne sollicite personne et ne prétend pas
que le financement est disponible. Son rôle présent est de rendre impossible la
confusion entre « plan de financement » et « argent qui peut réellement être
dépensé ».

```bash
node validate.mjs
node --test test.mjs
```

Voir [l'offre de continuité](offer.md), le [cas d'usage Mozambique](mozambique-funding-case.md)
et le [contrat de ressource](resource-vehicle.json).
