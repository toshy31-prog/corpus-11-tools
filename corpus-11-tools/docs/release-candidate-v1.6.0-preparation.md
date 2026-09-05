# Reçu de préparation — release candidate v1.6.0

Date : 2026-09-05

## Statut

`release_candidate_repair_required`

La contre-revue séparée a refusé temporairement la candidate : un exécutable Bubblewrap appelant pouvait attester abusivement une isolation, les montages protégés ne refusaient pas tous les ancêtres, la documentation distribuée dépendait d'une trace de recherche et deux liens documentaires applicables étaient cassés. Aucun tag, publication, installation ou réobservation de release n'est autorisé tant que les réparations et portes applicables ne sont pas au vert.

## Critères préalables

La tentative v0.1 est conservée comme refusée dans
[`release-candidate-independent-replication-acceptance.md`](release-candidate-independent-replication-acceptance.md).
Les critères v0.2 applicables sont figés dans
[`release-candidate-independent-replication-acceptance-v0.2.md`](release-candidate-independent-replication-acceptance-v0.2.md).
Ils limitent le contenu au harnais, à ses exports, documentation, tests et
métadonnées de release, avec la réparation bornée de la métavalidation rendue
nécessaire par une porte applicable. Ils exigent l'absence de règles, fixtures
ou résultats de recherche, le maintien de `independence_unknown`, Bubblewrap
optionnel sans fallback, aucune modification CCT et aucune modification
d'artefact scellé.

## Version déterminée

- base comparée : `v1.5.0` ;
- candidate : `v1.6.0` ;
- version de paquet : `1.6.0+codex.20260905213607`.

Le contrat de version vérifie une identité cohérente entre manifest, inventaire, lignée et tag ; il utilise une identité stable `vX.Y.Z` et une métadonnée de build après `+`. La décision mineure s'appuie sur le précédent du dépôt : v1.3.1 est une correction d'identité, tandis que v1.4.0 introduit des moteurs et interfaces génériques. Cette candidate ajoute une API publique sans rupture déclarée : `v1.6.0`, et non une patch-release ou une majeure.

## Diff exact de contenu candidat depuis v1.5.0

La comparaison exhaustive, y compris les fichiers non suivis, est consignée
dans [`release-candidate-v1.6.0-comparison.md`](../../release-candidate-v1.6.0-comparison.md).
Elle dénombre dix-sept chemins distribués dans `corpus-11-tools/` et quatre
reçus de gouvernance de candidate hors du sous-arbre distribué, soit vingt et
un chemins de candidate. Elle sépare ces rôles des changements étrangers de
recherche/CCT. Deux corrections documentaires de recherche, préalables à
`check_docs.py`, demeurent dans une liste distincte et ne font pas partie de la
candidate. Les autres changements présents dans le worktree sont exclus.

| Classe | Chemins |
| --- | --- |
| Harnais accepté | `labs/python/corpus_labs/independent_replication.py`; `labs/python/tests/test_independent_replication.py`; `labs/python/INDEPENDENT_REPLICATION.md`; `labs/python/corpus_labs/__init__.py`; `labs/README.md` |
| Métadonnées et lignée | `.codex-plugin/plugin.json`; `docs/inventory.json`; `skills/corpus-11-routing/references/organism-state.json` |
| Documentation de candidate | `README.md`; `docs/stability-contract.md`; `docs/release-validation-v1.6.0.md`; critères v0.1 et v0.2 ; ce reçu |
| Métavalidation bornée | `tools/test_validation_guards.py`; `docs/test-inventory.json` |
| Attestation de contenu | `docs/release-content-v1.6.0.json` (seul fichier exclu de sa propre liste d'empreintes) |

Empreintes de contrôle v0.2 avant la régénération finale du manifeste :

| Artefact | SHA-256 |
| --- | --- |
| `independent_replication.py` | `288b2ba7cd2a28ccee124e2cbbf262d66db5859479bc7f602ea5686c96a72bb4` |
| `test_independent_replication.py` | `bdd30ef6fe39d381c832b14f6b377f0c1554ecf71c773d7cdad477d569eb0efd` |
| arbre Git futur des tests Python | `5cd699ce0333da3829568fa374d1bdc921c760ab` |
| `INDEPENDENT_REPLICATION.md` | `a8033df4719acce5b5f41906863cfd7f9a27be1b5471485e81789e16833e3395` |
| exports `corpus_labs/__init__.py` | `0913e004dcce97f2f38942f33734a3f6344f151b63c589e088322abe21c35340` |
| manifest plugin | `7c33647fd5bbd19084156dce6098a596afae160131e56f671c34843931242cae` |
| inventaire | `d5df164aee8bfb80951ff703f1338e0734e75b3c0163819e43078256ae2f1316` |
| état d'organisme | `9fd720541f126dacb745b5469659d0ec8eaa5e133d9519591eb4bc5c9ae49b64` |
| garde de métavalidation | `dc143cf94efc521adc2033daa1786ff14595c32b45938b433a70bd54ad563892` |
| inventaire de tests | `1ac132ffe83296f0a84d1f4149923eef7fe51eb1857aad3442fbb768113ff0c3` |

L'attestation `release-content-v1.6.0.json` est régénérée après ce reçu ; elle est l'inventaire exhaustif de tous les octets distribués de la candidate.

## Contrôles exécutés

| Contrôle | Résultat observé |
| --- | --- |
| `PYTHONPATH=corpus-11-tools/labs/python python3 corpus-11-tools/labs/python/tests/test_independent_replication.py` | 16 succès ; 1 `skipped_unavailable` Bubblewrap dans le sandbox Codex, avec refus de namespace explicite |
| découverte Python `corpus_labs` | 42 tests passés ; 1 saut Bubblewrap attendu |
| `tools/validate_package.py` | PASS : 58 skills, 49 capabilities, 77 evals |
| `tools/check_boundaries.py` | PASS : aucun runtime produit ne dépend de `research/` |
| `tools/check_release_content.py` | PASS après génération de l'attestation candidate ; rejoué après ce reçu |
| `tools/check_graph.py` | PASS : 49 CAP, 4 FAM, 88 relations |
| `tools/check_evals.py` | PASS : 77/77 contrats, 49/49 capabilities |
| `tools/check_integrity.py` | PASS : 18 objets du registre d'intégrité et manifeste legacy |
| `tools/check_ci_pinning.py` | PASS |
| `tools/check_conversational_surface.py` | PASS : 6 fixtures |
| Node labs génériques | PASS : 10 tests, 0 échec |

## Contrôles non concluants sans maquillage

| Contrôle | État exact | Cause et suite autorisée |
| --- | --- | --- |
| `tools/check_release_identity.py` et `tools/check_organism.py --self-test` | `not_executable_before_tag` | Ils refusent correctement l'absence du tag `v1.6.0`. Créer ce tag est interdit avant contre-revue et autorisation. |
| `tools/check_docs.py` | `passed_after_repair` | Les deux liens ont été corrigés séparément ; le contrôle passe. |
| `tools/test_validation_guards.py` | `passed_after_maintenance_repair` | Les quinze mutations et leurs oracles sont inchangés ; copie projetée, garde d'espace et nettoyage par `finally` permettent leur exécution sans épuiser le volume. |
| `tools/check_test_inventory.py --self-test` | `pending_scoped_commit` | La réattestation des 17 modules HEAD reste observée ; l’entrée des tests Python vise maintenant l’arbre candidat réel `5cd699ce0333da3829568fa374d1bdc921c760ab`, qui n’existe pas encore dans HEAD. Le contrôle doit donc refuser l’arbre HEAD antérieur jusqu’au commit local autorisé, puis être rejoué. |
| installation propre et réobservation | `not_authorized` | Interdites avant contre-revue et autorisation explicite. |

## Réparations de la contre-revue

- `run_isolated_submission` ne reçoit plus d'exécutable Bubblewrap de
  l'appelant : il résout lui-même le binaire de production. Un test vérifie
  qu'un argument de faux backend est rejeté avant tout sous-processus et ne peut
  donc jamais produire `process_isolation_exercised`.
- Les montages de runtime refusent désormais le chemin protégé lui-même, ses
  descendants et ses ancêtres. Le test place paquet, source, dépôt et référence
  sous `/tmp`, hors du home, afin que cette protection soit effectivement
  démontrée.
- La documentation distribuée ne contient plus de commande FOE ni de lien vers
  une trace `research/`. Les deux liens documentaires cassés ont été corrigés
  séparément sans toucher aux artefacts scellés.

Les réparations spécifiques sont écrites et testées. La métavalidation est
verte ; l’inventaire est intentionnellement en attente du commit candidat qui
contient à la fois son nouvel arbre et son objet Git réel. Le statut reste
`release_candidate_repair_required` jusqu'aux commits locaux bornés, à la
régénération du manifeste v1.6.0 et au rejeu complet. Les traces exactes sont
consignées dans [`release-validation-v1.6.0.md`](release-validation-v1.6.0.md).

## Frontières et invariants contrôlés

- Aucun chemin CCT ne figure dans la liste fermée du diff candidat.
- Les quatre sentinelles scellées restent identiques avant et après la passe : protocole FOE `ad523be81c6a4f3478b8d88de41b85b99ee30b368c0f7729942d3cdbabd63711`, fixture FOE `0fde7cb2e30ee0352ab9f0101666698e485559fede42d7ec5df930daa22d41b1`, seal de campagne `01f82b7b93b59db23ea314f454fd18dfcc092275b47120862d9e75c740a5f09b`, reçu de campagne `8d30d014e0a28ce5600b9ea6621feb190c3a34f312dcb05b3be9088a18769273`.
- `independent_replication.py` et son test ne contiennent aucun import ni chemin d'exécution vers `research/`; `check_boundaries.py` passe.
- Le verdict d'indépendance reste `independence_unknown`; le test réel Bubblewrap saute ici par indisponibilité de namespace, sans fallback ni résultat simulé.

## Limites et porte de contre-revue

La candidate n'établit aucune indépendance externe, aucune validité scientifique générale et aucune capacité Bubblewrap sur le sandbox Codex. L'observation Bubblewrap Ubuntu reste une trace distincte, limitée à cet hôte.

Après réparation et passage vert des portes applicables, une nouvelle contre-revue Codex doit contre-relire séparément :

1. le diff fermé ci-dessus face aux critères ;
2. les exports `corpus_labs` et le chemin d'installation propre ;
3. les limites `independence_unknown`, Bubblewrap optionnel et absence de fallback ;
4. l'absence de contenu recherche/CCT et les blocages de worktree consignés.

Seule cette contre-revue peut demander ensuite l'autorisation de taguer, publier et installer. Elle ne doit pas corriger silencieusement les blocages hors périmètre.
