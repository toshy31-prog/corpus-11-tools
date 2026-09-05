# Reçu de préparation — release candidate v1.6.1

Statut : `release_local_prepared`.

La candidate corrige uniquement les frontières de validation publiées de
v1.6.0 : collecte Python, attestations, liens distribués et gel CCT v013. Elle
n'ajoute aucune capability et ne modifie ni le harnais de réplication, ni
`independence_unknown`, Bubblewrap optionnel ou l'absence de fallback.

- Base Git : `65fa6f2f236ebd0cb8102ff44e6d986109b6bcc9`.
- Version : `v1.6.1` / `1.6.1+codex.20260906000314`.
- Exclusions : nouveau harnais, recherche, artefact scellé et tag v1.6.0.
- Retrait : arrêter sur tout chemin étranger, dépendance ignorée, dérive de gel
  ou attestation incohérente.

Le futur commit et le tag v1.6.1 sont `not_verifiable_before_commit` et
`not_verifiable_before_tag`. Le manifeste est généré en dernier depuis le
checkout propre décrit dans la matrice de validation.
