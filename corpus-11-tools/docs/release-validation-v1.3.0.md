# Validation de release v1.3.0

## Périmètre

Cette release stabilise la frontière entre le produit Corpus, les laboratoires génériques, les projets de recherche et le registre de transfert. Elle ne transforme aucun résultat synthétique en validation extérieure.

## Matrice attendue

| Surface | Contrôle | Attendu |
|---|---|---|
| Paquet | `python3 tools/validate_package.py` | PASS |
| Graphe | `python3 tools/check_graph.py` | PASS |
| Documentation | `python3 tools/check_docs.py` | PASS |
| Frontières | `python3 tools/check_boundaries.py` | PASS |
| Candidat de surface conversationnelle | `python3 tools/check_conversational_surface.py` | 6/6 fixtures : paquet analytique scellé sous variations de présentation |
| Intégrité sources/archives | `python3 tools/check_integrity.py` | PASS |
| Identité release/tag | `python3 tools/check_release_identity.py` | PASS |
| Contrats et couverture des evals | `python3 tools/check_evals.py` | 77/77 contrats ; 49/49 capabilities couvertes positivement |
| Métavalidation | `python3 tools/test_validation_guards.py` | toutes les mutations adversariales rejetées |
| Installation plugin | installation clean-room Codex + `codex plugin list` | plugin détecté |
| Laboratoires Python | tests `corpus_labs` | tous les tests collectés doivent passer ; cardinalité figée par la gate totale |
| Moteur expérimental | tests génériques Node | tous les tests déclarés doivent passer ; zéro test interdit |
| Adaptateurs de recherche et simulateur de domaine | tests Node | tous les tests déclarés doivent passer ; zéro test interdit |
| Recherche CCT | `executable/run_all.py` | 10/10 contrôles |
| Recherche alimentaire terminée | `npm test` | 51/51 |
| Non-régression scientifique | récupération, temporalité, factorisation | toutes les unités déclarées doivent passer sans dérive matérielle inexpliquée |
| Routage comportemental | `tools/run_behavioral_evals.py --fresh --codex-home .validation-state/behavioral/codex-home --initialize-codex-home` | 77/77 en ordre forward et reverse, dans un état Codex isolé |

Les anciennes mentions `6/6`, `8/8`, `10/10` et `80/80` ne doivent pas être conservées comme nombres historiques si les suites auxquelles elles se rapportaient ont évolué. La gate totale doit compter les unités présentes, exécuter l’ensemble déclaré, refuser une découverte vide et rendre explicite toute modification de cardinalité. Les nombres qui restent intrinsèques au protocole — 10 contrôles CCT, 51 tests du prototype alimentaire et 77 evals de routage — restent des invariants explicites.

## Frontières vérifiées

- une recherche peut importer un outil générique Corpus ;
- aucun runtime Corpus n’importe une configuration, un résultat ou une conclusion de recherche ;
- chaque extraction acceptée indique sa destination, sa vérification et sa condition de retrait ;
- les prototypes et recherches terminés restent hors du produit utilisateur ;
- les fixtures démontrent le fonctionnement des instruments, pas une validation extérieure.

Les résultats réellement observés lors de la validation finale sont consignés dans le commit de release et doivent correspondre à cette matrice avant publication. Un contrôle non exécuté, une authentification absente, une découverte vide ou un résultat non comparable interdit un verdict `PASS total`.

Un épuisement extérieur de crédits, quota ou capacité Codex est enregistré comme
`BLOCKED_EXTERNAL_CAPACITY` (code de sortie `3`) ; il interrompt le gate sans
faire passer les évaluations restantes et interdit lui aussi un verdict `PASS
total`. Après résolution de la condition côté fournisseur, le checkpoint peut
être repris avec `--resume`.
