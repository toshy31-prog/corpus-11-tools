# Validation de release v1.2.0

Date : 17 août 2026.

## Résultat

La release est validée sur son périmètre déclaré. Le statut porte sur le paquet, ses interfaces, sa taxonomie et ses non-régressions ; il ne transforme pas les capabilities candidates en résultats scientifiquement validés.

## Matrice exécutée

| Surface | Vérification | Résultat |
|---|---|---|
| Plugin | structure et manifeste | succès |
| Corpus 11 | 58 skills, 49 capabilities, 71 évaluations | succès |
| Graphe | 49 CAP, 4 FAM, 88 relations, aucun orphelin | succès |
| Documentation | compteurs, taxonomie, descriptions, liens et carte du dépôt | succès |
| Porte de rendement | 5 tests | 5/5 |
| Laboratoire Corpus | tests Node | 17/17 |
| Effacement de mémoire | test du simulateur | 1/1 |
| Non-régression | récupération, temporalité, factorisation | 45/45, 18/18, 17/17 |
| CCT et gouvernance | 84 tests unitaires, 10 contrôles d’intégration | succès |
| Prototype alimentaire | logique et rendu | 51/51 |
| Archives | héritage Corpus, source CCT, bundle alimentaire | sommes et bundle valides |
| Données | JSON et JSONL suivis | syntaxe valide |
| Reproductibilité | deux exécutions CCT consécutives | artefacts identiques |

## Audit d’interférence

Par rapport à `v1.2.0-alpha.2`, aucun dossier de skill, nœud de capability, graphe d’exécution ou fichier d’évaluation n’a été ajouté ou retiré. La modification de l’index corrige la classification de neuf skills opérationnels sans changer le routage testé.

Conclusion bornée : **non-interférent sur le périmètre testé**. Cette conclusion doit être révisée si un cas hors des 71 évaluations révèle un changement de routage ou de conclusion imputable à la taxonomie.

## Révocation

Les conditions de retrait du statut stable sont définies dans le [contrat de stabilité](stability-contract.md).
