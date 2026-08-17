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
| Laboratoires Python | tests `corpus_labs` | 6/6 |
| Moteur expérimental | tests génériques Node | 8/8 |
| Adaptateurs de recherche et simulateur de domaine | tests Node | 10/10 |
| Recherche CCT | `executable/run_all.py` | 10/10 contrôles |
| Recherche alimentaire terminée | `npm test` | 51/51 |
| Non-régression scientifique | récupération, temporalité, factorisation | 80/80 |

## Frontières vérifiées

- une recherche peut importer un outil générique Corpus ;
- aucun runtime Corpus n’importe une configuration, un résultat ou une conclusion de recherche ;
- chaque extraction acceptée indique sa destination, sa vérification et sa condition de retrait ;
- les prototypes et recherches terminés restent hors du produit utilisateur ;
- les fixtures démontrent le fonctionnement des instruments, pas une validation extérieure.

Les résultats réellement observés lors de la validation finale sont consignés dans le commit de release et doivent correspondre à cette matrice avant publication.
