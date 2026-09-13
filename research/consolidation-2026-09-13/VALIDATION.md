# Validation de la consolidation

Commit des huit lots de recherche : `eeaf3d724cab8d8a372fdf6fd9781073f07389fc`.

Les dix commandes ci-dessous passent dans le worktree puis dans un clone local construit exclusivement depuis Git (`git clone --shared`). Le checkout Git seul est propre après exécution. Les journaux sont joints. Aucun fichier initial empreinté n’a changé pendant cette passe.

| Commande depuis la racine | Code de sortie dans Git seul |
| --- | --- |
| `git diff --check` | 0 |
| `python3 research/scripts/check_research_inventory.py` | 0 |
| `node research/active/cct/pol-1.1-executable/verify-contracts.mjs` | 0 |
| `node research/active/cct/external-simple-rival-pilot-v0.1/verify-freeze.mjs` | 0 |
| `node --test research/active/cct/external-simple-rival-pilot-v0.1/test.mjs research/active/cct/external-simple-rival-pilot-v0.1/test-sensitivity.mjs` | 0 |
| `python3 research/scripts/test_foe_001_independent_replication.py` | 0 |
| `python3 research/scripts/test_run_foe_001_transversal_campaign.py` | 0 |
| `python3 research/active/provenance-interoperability-lab/tests/test_independent_replication.py` | 0 |
| `python3 research/active/corpus-open-model/tests/test_product_query_evaluation_a_baseline.py` | 0 |
| `node --test research/artifacts/pr22-study-2026-09-13/source/test.mjs research/artifacts/pr22-study-2026-09-13/characterization.test.mjs` | 0 |

Les suites FOE-001 et évaluation A testent les contrats ; leurs campagnes gelées ne sont pas relancées. Les 24 tests PR #22 caractérisent le candidat, y compris ses défauts, et ne le valident pas. Les contrôles ne constituent pas un audit exhaustif des huit lots ni du produit.

## Paquet transmissible

Archive : `cct-external-review-2026-09-13.tar.gz` ; SHA-256 : `19433fefde766899e68661a21cfce04b89dcd6d771108a16b923e5ff831da071`. 23 fichiers avec manifeste interne. Extraction, empreintes, gel et suites du pilote vérifiés sans le reste du dépôt. Les deux évaluateurs refusent les soumissions absentes comme attendu.

Les deux publications Markdown sont fournies pour lecture ; leurs liens vers le dépôt complet peuvent sortir du périmètre de cette archive minimale. Les binaires DOCX/PDF préexistants ont été conservés dans Git, sans nouvelle vérification visuelle ni régénération.

## État restant

Les huit entrées hors recherche sont reportées explicitement dans le tri et conservées. Aucun push, message, collecte, installation, fusion distante ou essai territorial. Aucun statut externe promu.
