# Comparaison fermée — candidate v1.6.2 depuis `8524d816`

Statut : `release_local_prepared`.

Les douze chemins de métadonnées et d'attestation sont :

1. `CHANGELOG.md`
2. `README.md`
3. `corpus-11-tools/.codex-plugin/plugin.json`
4. `corpus-11-tools/README.md`
5. `corpus-11-tools/docs/behavioral-surface-inventory.json`
6. `corpus-11-tools/docs/inventory.json`
7. `corpus-11-tools/docs/release-candidate-v1.6.2-preparation.md`
8. `corpus-11-tools/docs/release-content-v1.6.2.json`
9. `corpus-11-tools/docs/release-validation-v1.6.2.md`
10. `corpus-11-tools/docs/stability-contract.md`
11. `corpus-11-tools/skills/corpus-11-routing/references/organism-state.json`
12. `release-candidate-v1.6.2-comparison.md`

Ils rendent attestable la release corrective et décrivent les deux correctifs
de test déjà présents dans `8524d816`. L'inventaire de tests n'est pas modifié
car il atteste déjà l'arbre `c413cd472ce7b80b57d7cd2b87d6c8c669c17809`.
Tous les autres changements, dont les 71 changements locaux hors périmètre,
sont exclus. Le manifeste est seul exclu de sa propre attestation.

Les empreintes complètes sont rapportées séparément depuis le checkout propre,
afin que ce document ne prétende pas se hacher lui-même. Aucun futur commit,
tag ou objet distant ne reçoit de valeur fictive.
