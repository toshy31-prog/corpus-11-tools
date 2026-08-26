# Campagne CCT–Virelia — projections adverses

Cette campagne confronte les octets gelés de CCT-EXEC 1.1 au monde Virelia R2
admis par Rich Arena v2. Elle ne modifie aucun de ces trois gels.

## Trois profils

- `P0-strict-original-view` conserve exactement l'information publique de
  Virelia. CCT ne peut pas initialiser son interface : Virelia ne fournit ni
  axes constitutionnels, ni ontologie institutionnelle, ni reçus.
- `P1-matched-public-mechanics` divulgue à tous les concurrents une compilation
  identique des effets immédiats sur les six variables publiques. Les cinq axes
  observables sont des proxys explicitement non validés ; l'attribution du
  pouvoir reste non observable.
- `P2-optimistic-harm-omission` reprend P1 mais supprime volontairement tous les
  dommages compilés afin de tester si CCT échoue encore lorsque l'évaluateur
  favorise son actionnabilité.

P1 et P2 ajoutent une information absente du régime original. La revendication
de projection « neutre » est donc retirée. Les profils servent à localiser la
dépendance au dispositif, pas à attribuer leurs catégories à Virelia.

## Résultat

CCT échoue dans les deux profils exécutables et ne termine aucun parcours :

- P1 : refus au tick 0, `CCT_I13_NO_CONSTITUTIONALLY_ADMISSIBLE_ACTION` ;
- P2 : triage au tick 0, puis `CCT_CAPACITY_ACQUISITION_INFEASIBLE` au tick 1.

Trois politiques minimales terminent chacune huit tours sous chaque profil,
soit six parcours complets. Leurs sept dimensions restent séparées ; aucun
vainqueur scalaire n'est produit. Les vecteurs CCT arrêtés avant terme sont des
préfixes non comparables et aucune suite matérielle n'est inventée après refus.

## Deux faiblesses précises de CCT-EXEC 1.1

1. P1 ne contient aucun tag I13 interdit, mais le runtime émet un code I13 parce
   qu'aucune action n'est sans dommage sur tous les axes. Il confond donc
   l'interdiction constitutionnelle et l'absence de solution sans coût.
2. Même après suppression optimiste des dommages, la récupération exige des
   types institutionnels, acteurs, recours et reçus qui n'existent pas dans
   l'espace d'actions physique de Virelia.

## Reproduction

Depuis ce dossier :

```bash
node test.mjs
node run-campaign.mjs --check
node verify-freeze.mjs
```

Statut maximal : `synthetic_control_failure_under_projection_variation`. Ce
résultat n'établit ni échec de terrain, ni invalidité générale, ni indépendance
de lignée, ni supériorité d'un rival, ni transport externe.
