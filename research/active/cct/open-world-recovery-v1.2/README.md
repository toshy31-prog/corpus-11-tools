# CCT-EXEC 1.2 candidate — récupération en monde ouvert

Cette candidate répond aux deux échecs gelés de CCT-EXEC 1.1 face à Virelia,
sans modifier 1.1 ni aucun artefact antérieur.

## Ce qui change

I13 et dommage matériel sont désormais deux contrôles distincts. Une action
n'est interdite par I13 que si elle porte effectivement un tag constitutionnel
interdit. Une action qui protège le vital tout en lésant un autre axe peut être
un triage, mais chaque axe lésé ou découvert devient une dette attribuable avec
la même échéance maximale de trois ticks.

Le runtime accepte aussi une preuve bornée d'effets publics actuels. Elle peut
proposer :

- un triage si les proxys vital et écologique progressent ;
- une acquisition de capacité si la portabilité ou la récupération progresse ;
- un maintien du plancher si vital et écologie ne régressent pas.

Cette compilation n'infère jamais une restauration et ne vaut jamais reçu. Un
gain doit toujours être confirmé par un observateur distinct, dans un domaine
de panne distinct. Acteur ou recours absents restent explicitement non résolus.

## Validation locale

Les 19 tests passent : compatibilité 1.1, priorité à la protection complète,
séparation I13/dommage/budget, dette de triage, compilation d'effets, refus des
fuites futures, refus de l'auto-certification, reçus indépendants, restauration
et clôture de dette.

Le rejeu de développement Virelia progresse plus loin dans les deux profils :

- 1.1 : 0 tour sous P1 et 1 tour sous P2 ;
- 1.2 : 2 tours sous P1 et P2 ;
- puis échec terminal honnête `CCT_CAPACITY_GAIN_UNVERIFIED` faute de reçu
  indépendant.

Virelia ayant servi à construire 1.2, ce rejeu ne peut ni promouvoir la
candidate ni établir sa robustesse. La prochaine épreuve valide exige un nouveau
monde tenu à l'écart, gelé avant toute exécution 1.2.

## Reproduction

```bash
node test.mjs
node run-virelia-development.mjs --check
node verify-freeze.mjs
```

Statut maximal : `locally_tested_post_failure_candidate`. Aucune autorisation,
mise en service, efficacité institutionnelle, supériorité, réobservation
indépendante ou portée externe n'est établie.
