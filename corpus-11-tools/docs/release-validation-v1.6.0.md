# Validation de release candidate v1.6.0

## Périmètre

Cette matrice prépare l'entrée du harnais de réplication indépendante dans le
produit. Elle couvre l'organe générique, ses exports, documentation et tests,
sans importer FOE-001, provenance, CCT ou une autre sémantique de recherche.
La candidate n'est ni taguée, ni publiée, ni installée.

## Matrice attendue avant contre-revue

| Surface | Contrôle | Attendu de la préparation |
| --- | --- | --- |
| Paquet | `python3 tools/validate_package.py` | PASS |
| Graphe | `python3 tools/check_graph.py` | PASS |
| Documentation | `python3 tools/check_docs.py` | PASS |
| Frontières | `python3 tools/check_boundaries.py` | PASS ; aucun runtime produit ne dépend de `research/` |
| Contenu candidat | `python3 tools/check_release_content.py` | PASS ; tous les octets de `corpus-11-tools/` concordent avec l'attestation v1.6.0 |
| Harnais Python | `PYTHONPATH=labs/python python3 labs/python/tests/test_independent_replication.py` | contrôles de contrat, négatifs, Bubblewrap conditionnel et `independence_unknown` |
| Evals | `python3 tools/check_evals.py` | 77/77 contrats ; 49/49 capabilities couvertes positivement |
| Métavalidation | `python3 tools/test_validation_guards.py` | mutations adversariales rejetées |
| Inventaire des tests | `python3 tools/check_test_inventory.py --self-test` | PASS après le commit local autorisé qui contient le nouvel arbre attesté ; refus HEAD attendu avant ce commit |
| Identité taguée | `python3 tools/check_release_identity.py` | non exécutable avant tag : interdit par cette passe |
| Installation propre | installation dans un home Codex isolé | non exécutée : interdite avant contre-revue et autorisation |
| CCT et recherches | diff de chemins et empreintes de sentinelles scellées | aucun changement de cette candidate |

Le test Bubblewrap réel peut signaler `skipped_unavailable` lorsque les
namespaces sont refusés. Cela ne devient jamais un succès d'isolation, ni une
preuve d'indépendance. La réobservation Ubuntu déjà consignée reste historique
et limitée à cet hôte.

## Résultat de réparation observé

Statut actuel : `release_candidate_repair_required`.

Les contrôles directs de paquet, frontières, graphe, évaluations, intégrité,
CI, surface conversationnelle, documentation et laboratoires passent. La suite
Python compte 42 succès et un `skipped_unavailable` Bubblewrap attendu dans ce
sandbox ; les dix tests Node passent. Les tests spécifiques du harnais comptent
16 succès et ce même saut conditionnel.

La métavalidation passe, sans changement de ses oracles. L’inventaire de tests
attend volontairement le commit candidat : son entrée référence déjà l’objet
Git de l’arbre qui inclut le test non suivi du harnais, donc elle ne peut pas
être verte contre HEAD antérieur.

### Métavalidation

`tools/test_validation_guards.py` exclut désormais `.venv`, `.venv-*`, états
locaux de validation et caches non distribués. Il mesure un unique clone
projeté, exige au moins 256 MiB de marge disque avant exécution et efface chaque
mutant dans un `finally`, ainsi que sa racine temporaire en cas d'interruption
Python. L'exécution observée disposait de 107344158720 octets libres pour un
clone projeté de 35797632 octets.

| Mutation | Verdict observé |
| --- | --- |
| 01 | retrait d'un transfert accepté rejeté |
| 02 | dépendance runtime vers recherche rejetée |
| 03 | import runtime d'un transfert candidat rejeté |
| 04 | dossier de capability déclaré manquant rejeté |
| 05 | identifiant d'évaluation dupliqué rejeté |
| 06 | skill attendu inconnu rejeté |
| 07 | perte de couverture positive unique rejetée |
| 08 | évaluation sans oracle dur rejetée |
| 09 | altération cryptographique de source rejetée |
| 10 | source d'intégrité absente rejetée |
| 11 | dérive version manifest/inventaire rejetée |
| 12 | compteur d'évaluations public périmé rejeté |
| 13 | compteur du contrat de stabilité périmé rejeté |
| 14 | contrat de surface candidat incomplet rejeté |
| 15 | dérive d'une copie canonique du graphe rejetée |

Le résultat est `PASS: 15 adversarial repository mutations rejected`. Cette
garantie couvre les interruptions contrôlées par Python ; une terminaison
forcée du processus reste hors de sa capacité d'assurer un nettoyage.

### Inventaire de tests HEAD

Le contrôle atteste désormais les 17 modules réellement découverts (et non 18)
par onze surfaces propriétaires HEAD : l'arène CCT `pol-1.1`, les tests de
Corpus Open Model, les tests `native_surface`, le harness de comparaison, le
rival FOE et les six scripts de recherche. Aucun de ces tests n'a été modifié.
Le test non suivi du harnais de réplication ne reçoit aucun hash fictif.

La réattestation des modules HEAD a été observée à 90 surfaces et 112 modules,
et son self-test a rejeté une mutation committée temporaire d'une surface
attestée. Ce résultat ne couvre pas encore le nouveau test du harnais. Les
critères v0.2 portent donc `git_object:
5cd699ce0333da3829568fa374d1bdc921c760ab` pour
`corpus-11-tools/labs/python/tests` : le contrôle refuse désormais, comme
attendu, l’objet HEAD antérieur `31a4df1a96be8cc5c0c96907724535fe66aac862`.
Après le commit local autorisé qui contient les deux fichiers, le self-test
doit être rejoué. La première exécution a eu lieu hors du sandbox Codex car sa
création/suppression de worktree requiert l'écriture temporaire dans `.git`.

## Porte suivante

`release_candidate_prepared` ne vaut ni acceptation, ni tag, ni publication,
ni installation, ni activation dans le plugin installé v1.5.0. Ce statut ne
peut revenir qu'après les commits locaux bornés autorisés, la régénération du
manifeste de contenu v1.6.0 et le rejeu de ses contrôles. Jusque-là,
`release_candidate_repair_required` reste exact, même lorsque les deux portes
réparées sont vertes.
