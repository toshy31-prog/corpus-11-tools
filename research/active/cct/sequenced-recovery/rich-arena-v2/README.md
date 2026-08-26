# CCT Rich Arena v2 — interpréteur candidat

Ce dossier rend exécutable le monde gelé `Virelia Fractured Atoll Cascade`
R2 sans modifier ses octets. Il compile ses conditions, expressions numériques,
bundles de deux actions, dépendances, délais, plafonds irréversibles, événements
exogènes, clamping, dimensions séparées et conditions de renversement vers le
contrat Open Experiment Arena.

## Résultat établi

- le gel Virelia R2 est vérifié par SHA-256 ;
- le document satisfait le langage riche v2 et le contrat Open Arena ;
- 20 tests locaux passent ;
- les 8 actions unitaires accomplissent chacune une trajectoire de 8 tours ;
- les 27 bundles initialement admissibles exécutent chacun un tour ;
- aucune des quatre variables cachées n'apparaît dans les vues publiques testées ;
- délais, plafonds permanents, renversements, appariement initial et huit tours
  complets sont exercés.

Le rapport reproductible est `admission-report.json`. Le reproduire :

```bash
node test.mjs
node admit-virelia.mjs --check
node verify-freeze.mjs
```

## Conventions de l'évaluateur

Les bundles sont des ensembles non ordonnés appliqués dans l'ordre canonique des
identifiants. La liste des bundles admissibles est publique ; elle peut donc
révéler indirectement une précondition portant sur l'état caché. Si aucune
action déclarée n'est admissible, `__forced_no_action__` fait avancer uniquement
les événements exogènes et les effets différés dus. Les effets permanents
`min|max` conservent leur borne littérale déclarée. Une chute totale fixe les
sept dimensions à leur seuil d'échec et émet en plus un drapeau numérique de
renversement.

Ces règles sont des choix explicites du moteur, pas des observations sur
Virelia. Toute comparaison doit les partager à l'identique.

## Frontière de conclusion

Virelia est admis dans cet interpréteur, **pas encore dans une confrontation
CCT-EXEC 1.1**. CCT-EXEC attend six axes de risque, un budget de capacité, des
sémantiques d'action, des attestations, des reçus et une temporalité de
récupération que Virelia ne fournit pas sous ces noms. Les projeter exige un
contrat neutre, visible par tous et gelé avant l'exécution des concurrents.

Le statut maximal est `locally_tested_interpreter_admission`. Il n'établit ni
robustesse, ni supériorité, ni indépendance de lignée, ni autorisation,
déploiement, effet institutionnel, réobservation indépendante ou transport.
