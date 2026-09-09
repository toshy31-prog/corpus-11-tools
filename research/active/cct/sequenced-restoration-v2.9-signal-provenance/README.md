# CCT-EXEC 2.9 — provenance des signaux adaptatifs (candidat)

## Lacune traitée

La version 2.8 engage le plan avant exercice, mais ses marges et scores peuvent encore provenir d'une seule organisation, d'une mesure non calibrée ou de plusieurs fichiers partageant la même origine.

## Gain concret

Le candidat 2.9 exige au moins deux attestations par marge et par score, avec racines de source, contrôleurs et domaines de panne distincts. Elles doivent précéder l'engagement et réussir une épreuve aveugle. Chaque marge repose sur au moins 12 observations ; le compilateur retient la valeur minimale. Chaque risque repose sur au moins 30 observations, une erreur de calibration au plus égale à 0,1 et une valeur bornée entre 0 et 1 ; le compilateur retient la valeur maximale.

Les valeurs compilées reçoivent une racine SHA-256 liée aux attestations. Toute valeur substituée, attestation dépendante, tardive, sous-échantillonnée ou non calibrée cesse de pouvoir orienter les six contextes supplémentaires de 2.8.

Le statut `bounded_provenanced_risk_signals_candidate` vérifie cette cohérence interne. Il ne prouve ni l'indépendance réelle des organisations déclarées, ni la validité externe ou la transportabilité des mesures.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v2.9-signal-provenance/test.mjs
node research/active/cct/sequenced-restoration-v2.9-signal-provenance/held-out/run-confrontation.mjs
```
