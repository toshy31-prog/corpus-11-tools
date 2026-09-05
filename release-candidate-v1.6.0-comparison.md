# Comparaison exhaustive — candidate v1.6.0 depuis v1.5.0

Date : 2026-09-05

Statut : `release_candidate_repair_required`. Cette comparaison applique les
[critères v0.2](corpus-11-tools/docs/release-candidate-independent-replication-acceptance-v0.2.md).
La tentative v0.1 demeure refusée et archivée dans le fichier homonyme sans
suffixe.

La base est le tag `v1.5.0`. L’inventaire combine les chemins suivis modifiés
et les fichiers non suivis, sans recourir à `git diff` seul. Les chemins
ci-dessous sont les seules modifications proposées pour la candidate ; ils
comprennent volontairement la réparation bornée de métavalidation et son
inventaire de tests, car la release en dépend.

## Candidate v1.6.0 — 21 chemins exacts

### Sous-arbre distribué `corpus-11-tools/` — 17 chemins

1. `corpus-11-tools/.codex-plugin/plugin.json`
2. `corpus-11-tools/README.md`
3. `corpus-11-tools/docs/inventory.json`
4. `corpus-11-tools/docs/release-candidate-independent-replication-acceptance.md` (v0.1 refusée)
5. `corpus-11-tools/docs/release-candidate-independent-replication-acceptance-v0.2.md`
6. `corpus-11-tools/docs/release-candidate-v1.6.0-preparation.md`
7. `corpus-11-tools/docs/release-content-v1.6.0.json` (auto-exclu de son propre manifeste)
8. `corpus-11-tools/docs/release-validation-v1.6.0.md`
9. `corpus-11-tools/docs/stability-contract.md`
10. `corpus-11-tools/docs/test-inventory.json`
11. `corpus-11-tools/labs/README.md`
12. `corpus-11-tools/labs/python/INDEPENDENT_REPLICATION.md`
13. `corpus-11-tools/labs/python/corpus_labs/__init__.py`
14. `corpus-11-tools/labs/python/corpus_labs/independent_replication.py`
15. `corpus-11-tools/labs/python/tests/test_independent_replication.py`
16. `corpus-11-tools/skills/corpus-11-routing/references/organism-state.json`
17. `corpus-11-tools/tools/test_validation_guards.py`

### Reçus et métadonnées de gouvernance hors distribution — 4 chemins

18. `CHANGELOG.md`
19. `README.md`
20. `transfers/accepted/independent-replication-harness.md`
21. `release-candidate-v1.6.0-comparison.md` (ce reçu, exclu de sa propre empreinte)

Les dix-sept chemins distribués contiennent le harnais, ses exports, tests,
documentation, inventaires et métadonnées de release. Les deux chemins de
métavalidation ne modifient ni les quinze mutations ni leurs oracles : ils
évitent seulement que des états non distribués faussent leurs copies, exigent
une marge disque et garantissent le nettoyage temporaire.

## Empreintes du diff fermé

Les SHA-256 ci-dessous comparent chaque chemin non auto-référent à `v1.5.0`.
Le manifeste distribué `release-content-v1.6.0.json` atteste en plus les
**328 fichiers** et **3 987 666 octets** de `corpus-11-tools/`, hors son propre
chemin ; son SHA-256 est
`3708c097a9ec88ce494707e15d0d108f0b4bfb461f7aa0ce8a4853a9dd42df3e`.

| Chemin | v1.5.0 SHA-256 / octets | candidate SHA-256 / octets |
| --- | --- | --- |
| `CHANGELOG.md` | `7a325ffc27d78f486d840ace423582d390c1235829f65718e4e070e75f929195` / 7712 | `1f0f375b9a2c8821da7a9c76956b0984918761e944304370b565c57f5c7e83f1` / 8377 |
| `README.md` | `b8275e8aaa77bd24538f1716a42b853731b1144a8622debb6bfe50fab0a03880` / 19822 | `c8b452facad197a5131c4920a9ea8b223fa0fd29208e897fd0cc3bdb2072cb34` / 20697 |
| `corpus-11-tools/.codex-plugin/plugin.json` | `528569b85d53c4f40cd688f6a46f815ec71f32e1258457aae6f0924ffca706f7` / 1375 | `7c33647fd5bbd19084156dce6098a596afae160131e56f671c34843931242cae` / 1397 |
| `corpus-11-tools/README.md` | `0112759e4d2040c7835e2c0b8ebbf6a0e9f219f950009b2f67c30a10c7613801` / 12341 | `0f49cfae1964e60f494c56e8029aed891ad58ef920e811c499646588f3165e77` / 13386 |
| `corpus-11-tools/docs/inventory.json` | `dd0ed25b5f2a5c9341e003e8a6f4afe6301905e303777193564358016715d9fe` / 2703 | `d5df164aee8bfb80951ff703f1338e0734e75b3c0163819e43078256ae2f1316` / 2703 |
| `corpus-11-tools/docs/release-candidate-independent-replication-acceptance.md` | absent | `7caefe237c4bf91c1416905615c640c786708bb0f0c93870125f6c1ce5f8c7d3` / 3915 |
| `corpus-11-tools/docs/release-candidate-independent-replication-acceptance-v0.2.md` | absent | `1c17f26020d49cd72c8b4d20a055b9a50b422bdb8832170008c6d71c6f7c2272` / 4674 |
| `corpus-11-tools/docs/release-candidate-v1.6.0-preparation.md` | absent | `4f6c6f912f0740ddce982f5c684e11ca8bd15ad05687c8584934c8f56ddefa69` / 9890 |
| `corpus-11-tools/docs/release-content-v1.6.0.json` | absent | `3708c097a9ec88ce494707e15d0d108f0b4bfb461f7aa0ce8a4853a9dd42df3e` / 59692 |
| `corpus-11-tools/docs/release-validation-v1.6.0.md` | absent | `a523bc655294f2731dc526c2a00923d1ab948057adceb9db02b8ef69e9620498` / 5959 |
| `corpus-11-tools/docs/stability-contract.md` | `cdaddaedfc69ffffc477b9961a8cd3ec0d6ffac3b3fbf4a94ab8faff01779931` / 2477 | `b406f8ef6c77c9a8ea74cc375f8ea2587e0113a23a4c1fca30b4a972e902999b` / 3009 |
| `corpus-11-tools/docs/test-inventory.json` | `fd36e3b7883305598cd9b93b4cfd62d2320c4d84f8501d40838c953e374ac0ac` / 12841 | `1ac132ffe83296f0a84d1f4149923eef7fe51eb1857aad3442fbb768113ff0c3` / 14464 |
| `corpus-11-tools/labs/README.md` | `0fca51b1f4d00ffc9d5e6b834cd3378a164742e8c93e58e8d338182ab2171013` / 3159 | `524ab7fa7afc06e19bc6de21660c376762e9fde9685d92dd246fad02fa2bc267` / 3506 |
| `corpus-11-tools/labs/python/INDEPENDENT_REPLICATION.md` | absent | `d8c1d8d6e4d846b5b61a8c111fd26ae1ef87f080fd7bd851a29ebe6171a0a99f` / 4782 |
| `corpus-11-tools/labs/python/corpus_labs/__init__.py` | `e41b88359bcae6f66f9a80fcd2dadb4eb90a557cb34500c8ac5969882e5b6a54` / 1125 | `0913e004dcce97f2f38942f33734a3f6344f151b63c589e088322abe21c35340` / 1734 |
| `corpus-11-tools/labs/python/corpus_labs/independent_replication.py` | absent | `288b2ba7cd2a28ccee124e2cbbf262d66db5859479bc7f602ea5686c96a72bb4` / 31779 |
| `corpus-11-tools/labs/python/tests/test_independent_replication.py` | absent | `bdd30ef6fe39d381c832b14f6b377f0c1554ecf71c773d7cdad477d569eb0efd` / 18315 |
| `corpus-11-tools/skills/corpus-11-routing/references/organism-state.json` | `5207497f9ea4464e33e5aebc738cbaceb1c605405fb351a59951f9d0baacff5e` / 4388 | `9fd720541f126dacb745b5469659d0ec8eaa5e133d9519591eb4bc5c9ae49b64` / 4693 |
| `corpus-11-tools/tools/test_validation_guards.py` | `69c4c31a2f9f6223916dd4a76b06f16eab031f9d370520c0917afe3f7a253858` / 10255 | `dc143cf94efc521adc2033daa1786ff14595c32b45938b433a70bd54ad563892` / 12070 |
| `transfers/accepted/independent-replication-harness.md` | absent | `3f80bdebf6711b7d7f28f2345695cfaee766e7b115e743e3503f1372c711a349` / 3452 |

Ce reçu est la vingt-et-unième modification et est exclu de sa propre
empreinte, comme le manifeste l’est de la sienne.

## Objet Git réel du nouvel arbre de tests

Le test du harnais est nouveau. Son blob calculé est
`17028448cf2bc43994ac573ab1c9e2fb22ff94ea`. Avec les trois tests Python déjà
suivis, l’objet de l’arbre Git futur est
`5cd699ce0333da3829568fa374d1bdc921c760ab`. Cette valeur a été calculée à
partir des quatre entrées de l’arbre, puis vérifiée avec
`git hash-object -t tree --stdin`; elle figure dans
`docs/test-inventory.json`.

HEAD porte encore l’arbre antérieur
`31a4df1a96be8cc5c0c96907724535fe66aac862`. Le refus actuel de
`check_test_inventory.py` est donc attendu et protecteur : il prouve que
l’inventaire ne prétend pas attester le test non suivi. Après un commit local
autorisé qui contient à la fois le test et cet inventaire, le contrôle devra
être rejoué ; aucun succès anticipé n’est déclaré ici.

## Précondition documentaire distincte — 2 chemins, hors candidate

`check_docs.py` exige deux corrections de liens dans des documents de recherche
qui ne font pas partie du contenu de la v1.6.0 :

1. `research/active/corpus-open-model/README.md` — correction de chemin vers
   le protocole propriétaire ;
2. `research/active/model-response-comparison-harness/state/current_state.md`
   — correction de lien vers le reçu B et état propriétaire déjà écrit de
   l’évaluation A à `pipeline_verified`, avec ses limites.

Ces deux fichiers ne sont ni CCT, ni artefacts/protocoles scellés, ni contenu
produit. Ils requièrent une autorisation locale séparée s’ils doivent être
committés avant la candidate ; leur présence ne doit pas être déguisée en
maintenance de la release.

## Exclusions vérifiées

Sont exclus des deux listes : tout chemin `research/active/cct/`, les artefacts
et protocoles scellés, l’Atlas, les autres recherches, les caches et les états
locaux. Le travail ne crée ni capability, ni moteur de mutations, ni contenu
FOE/provenance dans le produit. Aucun fichier n’est ajouté à l’index dans cette
passe.

## Condition de préparation

Le manifeste de contenu ne sera régénéré qu’après cette liste fermée. Le
statut demeure `release_candidate_repair_required` jusqu’au commit local
autorisé, au rejeu de l’inventaire contre son vrai arbre Git et aux autres
contrôles applicables. `release_candidate_prepared` reste donc interdit ici.
