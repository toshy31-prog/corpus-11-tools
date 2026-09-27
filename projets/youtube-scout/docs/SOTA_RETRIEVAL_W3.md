# Retrieval identité W3 — protocole figé avant résultat

27 septembre 2026. Corpus Leipzig CC BY4 déjà téléchargé, hash et attribution dans `SOTA_EXTERNAL_IDENTITY.md`. Aucun téléchargement supplémentaire.

Mécanisme : index inversé local sparse, tokens artiste/titre et trigrammes caractères normalisés, pondération IDF/cosinus ; aucune dépendance, aucun modèle ni seuil identité modifié. Baselines : clés exactes par champ et tokens seuls, mêmes k=1,5,10. Pas d'entraînement.

Protocole gelé : partition CID par premier octet SHA256(CID) modulo5 ; bucket0 réservé hors mesure (développement non utilisé), buckets1..4 évaluation ; une requête par CID dupliqué (deuxième ligne), référence première ligne. Mille premiers CID d'évaluation triés SHA256(CID). Références dont second octet SHA256(CID) modulo5=0 retirées de l'index pour simuler identité absente. Mesurer recall@k uniquement gold présent ; décisions du scorer existant sur top10 pour gold présent et absent séparément ; coverage et fausses autoacceptations ensemble. Aucun gold injecté, CID jamais passé au module index. Aucun réglage après résultats.

Sources primaires consultées : [NAACL2024 étude reproductibilité blocking](https://aclanthology.org/2024.naacl-long.483/) distingue récupération et décision ; [Leipzig FAMER](https://old.dbs.uni-leipzig.de/research/projects/object_matching/) documente blocking multi-passes ; [CE-RAG4EM2026](https://arxiv.org/abs/2602.05708) propose optimisation blocking/batch pour réduire coût. Ici réemploi du principe de réduction de candidats, pas reproduction des réseaux/LLM de ces travaux ni équivalence SOTA. L'index reste expérimental, non connecté à la production.

## Résultat observé sans retouche

7 948 références indexées ; 1 000 CID distincts évalués, dont **815 gold présents et 185 absents**. Le hash du corpus est contrôlé par le banc. La partition CID interdit de sélectionner plusieurs requêtes du même cluster ; aucun entraînement ni sélection de paramètres sur le bucket développement.

| Mesure | Clés exactes par champ | Tokens IDF | Tokens + trigrammes IDF |
|---|---:|---:|---:|
| Recall@1 (sur 815) | 328 | 720 | 722 |
| Recall@5 | 364 | 771 | 780 |
| Recall@10 | 366 (44,91 %) | 779 (95,58 %) | 787 (96,56 %) |
| Autoacceptations correctes | 47 | 48 | 48 |
| Fausses autoacceptations, gold présent | 0 | 0 | 0 |
| Autoacceptations, gold absent | 0/185 | 0/185 | 0/185 |
| Couverture automatique globale | 4,7 % | 4,8 % | 4,8 % |
| Candidats soumis au scorer | 693 | 8 977 | 9 895 |
| Construction index (ms, une exécution) | 41,9 | 58,9 | 225,2 |
| Recherche + décision (ms, une exécution) | 63,8 | 527,1 | 1 965,0 |

Gain borné démontré : **8 références correctes supplémentaires retrouvées au top10** par rapport aux tokens, soit +0,98 point de recall, mais aucune identité automatique supplémentaire. Le coût de recherche/décision observé est environ 3,7 fois celui des tokens ; temps indicatifs, non benchmark matériel stabilisé. Le traitement hybride ne domine donc pas tous les axes. Recommandation : conserver les tokens comme baseline économique et l'hybride comme candidat expérimental à revoir, sans promotion production automatique.

Les 952 décisions non automatiques du mode hybride ne sont pas des réussites d'identification ; zéro erreur parmi seulement 48 autoacceptations ne garantit pas risque nul. Les négatifs absents sont des retraits artificiels par CID ; les corruptions DAPO demeurent synthétiques. Ce test ne concerne ni YouTube en direct, ni durée/version, ni écoute humaine. La corpus a déjà été examiné en W2 : nouveau protocole figé, mais pas jeu entièrement aveugle jamais consulté.

## Vérification et reproduction

`node --test lib/identity-candidate-index.test.mjs` : 1 fichier passé, exit0. Tests noms accentués, faute partielle, aucune information, égalités déterministes, ids dupliqués, bornage k.

`node scripts/evaluate-identity-retrieval.mjs /tmp/scout-external-er-0sYL7Q/musicbrainz-20-A01.csv.dapo` : exit0, résultats ci-dessus. Script hash-verrouillé, parsing CSV strict colonnes/guillemets, aucun réseau ni installation.

Fichiers nouveaux : `lib/identity-candidate-index.mjs`, test associé, `scripts/evaluate-identity-retrieval.mjs`, ce rapport. Aucun fichier préexistant modifié ni sauvegarde nécessaire ; scorer et services inchangés.

Prochaine tâche bornée proposée : revue indépendante de l'index et de ses métriques, puis diagnostic des 28 gold encore absents au top10 (sans recalibrer sur cette mesure) pour préparer un futur jeu tenu à l'écart. Ne pas annoncer niveau SOTA atteint.
