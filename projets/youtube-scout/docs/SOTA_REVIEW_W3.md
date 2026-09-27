# Revue indépendante — vague 3 — 27 septembre 2026

## Récupération d'identités

Relus : index, test, banc et protocole `SOTA_RETRIEVAL_W3.md`. Reproduction locale du script sur le même fichier Leipzig déjà autorisé, aucun téléchargement ni ajustement de paramètres. Code 0.

| Résultat reproduit | Exact | Tokens | Hybride |
|---|---:|---:|---:|
| Recall@1, compte sur 815 présents | 328 | 720 | 722 |
| Recall@5 | 364 | 771 | 780 |
| Recall@10 | 366 | 779 | 787 |
| Auto-acceptations correctes | 47 | 48 | 48 |
| Auto-acceptations fausses, présents | 0 | 0 | 0 |
| Auto-acceptations sur 185 absents | 0 | 0 | 0 |
| Candidats examinés | 693 | 8 977 | 9 895 |

7 948 références indexées; 1 000 CID distincts interrogés. Le mapping adapté transmis à l'index contient seulement ID/TID, titre et artiste : pas CID. Le gold n'est ni injecté ni forcé dans les résultats; son absence artificielle retire sa référence de l'index avant chaque variante. Les labels ne sont employés qu'au décompte. Les égalités de similarité sont déterministes par ID, pas gold-first. Le budget top10 est identique mais nombre effectivement retrouvé varie; ne pas prétendre un coût identique.

La partition par CID empêche les requêtes répétées du même cluster. Les références du bucket non évalué peuvent rester au catalogue, ce qui est normal pour cette récupération transductive sans entraînement : ne pas appeler cela test cold-start strict. Le jeu avait été consulté en W2, ses perturbations DAPO sont artificielles, les absences aussi. L'hybride gagne huit références top10 sur les tokens mais aucune identité automatique; aucune promotion ni record SOTA justifiés.

Temps observés dans cette reproduction : construction 36,4 / 59,6 / 248,3 ms; recherche+décision 61,7 / 583,2 / 2 004,8 ms. Indicatifs seulement, pas protocole de benchmark matériel stabilisé. Les résultats de qualité, non les durées, reproduisent exactement le rapport.

## Préparation aveugle de jugements

Relus : `scripts/blinded-discovery-evaluation.mjs` et son test. Le paquet juge omet noms des méthodes, IDs originaux, scores et positions; tri des tokens indépendant des classements. Le titre et les artistes restent visibles intentionnellement. Le sel n'est pas livré dans le paquet. Ce masquage n'est pas anonymat cryptographique et ne protège pas contre des métadonnées contenant elles-mêmes des indices de méthode.

Jugements manquants/null restent inconnus. Les lignes de jugement sont un tableau; doublons queryToken/itemToken rejetés plutôt qu'écrasés par JSON. Un appel représente un juge, sans consensus humain inventé.

**Défaut d'import communiqué au propriétaire :** une clé modifiée avec deux items d'IDs distincts partageant un itemToken était acceptée par `evaluateBlindJudgments`. Un seul grade 3 devenait deux grades 3 et donnait nDCG=1 aux deux classements. La préparation normale ne produit pas cette collision; la frontière d'import nécessitait néanmoins validation de l'unicité des tokens de chaque item. Réproduction locale effectuée, sans modifier le fichier du propriétaire. Le hash retourné sans recomputation n'est pas à lui seul un scellement du protocole ou des classements.

Le propriétaire a ensuite ajouté la validation préalable des IDs/tokens/méthodes uniques et des classements admissibles. Contre-exemple rejoué indépendamment : désormais rejeté, plus de propagation du grade. Suite `node --test tests/blinded-discovery-evaluation.test.mjs lib/identity-candidate-index.test.mjs` passée (deux fichiers, code 0). Le hash est explicitement limité à la traçabilité, pas au scellement.

Conclusion : récupération extérieure reproduite avec ses limites; défaut d'import de clé corrigé et revalidé. Aucun autre défaut bloquant observé dans cette revue limitée. Aucun jugement musical humain nouveau n'a été collecté.
