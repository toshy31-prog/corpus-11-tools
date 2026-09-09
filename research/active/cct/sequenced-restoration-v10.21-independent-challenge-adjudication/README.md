# CCT-EXEC 10.21 — adjudication indépendante des contestations

## Lacune fermée

10.20 suspendait correctement une séparation contestée, mais ne disposait
d’aucune voie vérifiable pour résoudre la contestation.

## Gain concret

Une clôture exige deux centres d’adjudication distincts, sans racine de contrôle
commune avec l’autorité contestée, deux signatures Ed25519 valides, des verdicts
concordants et un motif lié par SHA-256. Les signatures couvrent aussi le hash
canonique de l’autorité, de la dimension et de la valeur exactement contestées.
Un juge unique, un désaccord, l’auto-jugement, un motif modifié ou un grief
substitué maintiennent la suspension.

Les juges, clés et motifs sont synthétiques. La couche établit la mécanique de
clôture, pas la légitimité réelle des juges ni la vérité de leur motif.

## Condition de retrait

Retirer cette couche si un centre unique, un juge lié, des verdicts divergents,
une signature invalide, un motif non lié ou un grief modifié peuvent clore une
contestation.
