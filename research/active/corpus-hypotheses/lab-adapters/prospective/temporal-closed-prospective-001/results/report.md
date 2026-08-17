# Rapport de l'expérience prospective fermée

## Antériorité

- Commit A : `9cfc9a0c3c1ebdeaa2b69b2387bcedbada69c70c`.
- Ce commit contient uniquement `manifest.json`, `protocol.lock.json` et `execution.lock.json`.
- Aucun résultat ni interprétation n'était présent avant l'exécution primaire.

## Empreintes verrouillées

- `protocol_hash` : `sha256:827c8d38965ea18366902c14aaa18f37825a78f7532201dd30aaab54c2274035`.
- `experiment_fingerprint` : `sha256:81e1b1a88e75b1de9dee1eeb32011dbc0ee7df324df148f3ec529abe0c2836a8`.
- `raw_hash` : `sha256:b76093f0aeb3113b5d83f04d672f291234b227c0ef6322ce332a124a73c0b328`.
- `classification_hash` : `sha256:4dfd0e2f105c9e9ac0c9ba19616dce0c0edc201c648da7ae42ebc42fbd9dfa3f`.

## Résultat automatique

- Échantillon : 24 tournois à 7 sommets, graine `1618033988`.
- Histogramme du minimum exact : `{2: 6, 3: 6, 4: 10, 5: 2}`.
- Maximum : `5`.
- Moyenne : `80/24` arêtes rétrogrades.
- Contrôle de renommage : `0` écart, réussi.
- Contrôle d'inversion globale : `0` écart, réussi.
- Classification mécanique : `not_triggered`.
- Conditions de renversement déclenchées : aucune.

La classification découle uniquement des observables, contrôles et seuils verrouillés. Elle indique que la prédiction enregistrée n'est pas renversée dans cet échantillon fini ; elle ne valide aucune interprétation physique ou générale de la frustration temporelle.

## Reconstruction

L'unique reconstruction déterministe autorisée par le manifeste a régénéré les cinq artefacts (`raw_results`, sortie calculée, comparaison, classification et attestation) de manière identique octet par octet. Le `protocol_hash`, l'`experiment_fingerprint`, le `raw_hash` et la classification sont inchangés.

## Verdict de chaîne

La démonstration prospective complète est réussie : intention et exécution ont été figées avant résultat, le runner a vérifié l'environnement avant calcul, la classification a été produite sans interprétation humaine et la reconstruction est exacte.
