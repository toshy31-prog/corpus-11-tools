# CCT-EXEC 1.5 candidate — provenance des reçus

Cette couche candidate répond à une limite de CCT-EXEC 1.4 : deux reçus peuvent
être formellement distincts tout en réutilisant le même artefact ou la même
chaîne de collecte. Elle exige des observateurs, domaines de panne, artefacts
et empreintes de source distincts, ainsi qu'une limite de collecte déclarée.

Elle ne prouve pas que les artefacts sont vrais ni qu'une institution est
indépendante. Elle rend cette question inspectable et bloque la réutilisation
visible avant qu'un paquet soit présenté comme confirmation plurielle.

Le runtime candidat applique cette porte aux confirmations de gain de capacité
et aux reçus de réparation avant de les transmettre à la couche 1.4. Un reçu
de réparation porte son propre `provenanceBundle` ; sans bundle conforme, il
ne peut pas fermer une dette.

L'épreuve interne tenue à l'écart `held-out/shared-origin-receipts.json` vérifie
que deux exports aux empreintes différentes, mais issus d'une même collecte,
sont rejetés. Elle peut révéler une faiblesse de la candidate ; elle n'établit
ni indépendance réelle ni robustesse externe.

La confrontation `held-out/confrontation-v1.json` compare cette barrière à un
accepteur formel de reçus. Elle garde séparées l'intégrité de preuve et la
clôture de dette : le refus prudent ne devient pas une victoire scalaire.

```bash
node --test test.mjs
```

Statut : `written_and_locally_tested_candidate`; elle ne modifie ni ne promeut
CCT-EXEC 1.4 gelé.
