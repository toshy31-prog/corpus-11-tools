# Fidélité des chemins — vague 3 — 27 septembre 2026

## Défaut reproduit et correction

Le résumé de frontière encodait chaque arête par concaténation `from>relation>to`, puis les étapes avec `|`. Les identifiants autorisés peuvent contenir ces caractères. Deux chemins structurellement différents devenaient la même clé : `a>published_by>b` → `c` et `a` → `b>published_by>c`, avec relation `published_by` dans les deux cas. Le compteur sous-estimait alors les chemins. Aucun exemple issu de données personnelles employé.

Correction bornée dans `public/discovery-frontier.mjs` : encodage JSON de tuples `[from, relation, to]`, chemin vide toujours sans clé. Aucune modification des identités, preuves, poids, permissions de route ou algorithme de recommandation. Les signatures explicites fournies en entrée restent inchangées. Les signatures de repli locales changent de représentation, sans migration de catalogue.

Sauvegarde : `/tmp/scout-discovery-w3-VDRqmF/discovery-frontier.mjs`. Comparaison exécutée en important baseline et correctif : huit directions, deux chemins distincts par direction, **8 chemins comptés avant, 16 après, 16 attendus**. Cette fixture artificielle cible la collision; elle ne mesure pas un gain de pertinence utilisateur.

## Sources primaires vérifiées et réemploi

- Chercheurs : [KPRN, AAAI 2019](https://arxiv.org/abs/1811.04540) compose entités et relations séquentielles pour exploiter plusieurs chemins explicatifs. Leçon utile : ne pas confondre chemins ni perdre leur structure. Pas d'adoption de son réseau, de ses poids ou de ses résultats comparatifs.
- Industriels : [Google/YouTube, ranking multitâche](https://research.google/pubs/recommending-what-video-to-watch-next-a-multitask-ranking-system/) traite objectifs concurrents et biais de sélection. Cette correction porte sur la fidélité d'une mesure, pas un score d'engagement industriel ni une équivalence au service.
- OSS : [RecBole](https://github.com/RUCAIBox/RecBole), bibliothèque de recommandation sous MIT, reste un candidat pour comparaison reproductible future; aucun code ni corpus importé. Le correctif est une sérialisation locale originale avec les primitives JavaScript, sans nouvelle licence/dépendance.

## Validation et limites

Nouveau `public/discovery-path-fidelity.test.mjs` : collision et rejeu sur les huit directions, convergence conservant deux provenances, statut inchangé, non-mutation. Un second cas vérifie qu'un chemin vide reste absent et qu'un chemin cyclique de dix étapes est **rapporté** avec sa longueur réelle même si profondeur demandée six. Le résumé n'est pas un validateur du graphe; masquer ou tronquer ce cas aurait donné une preuve trompeuse.

```sh
node --test public/discovery-path-fidelity.test.mjs public/discovery-provenance.test.mjs lib/r11-discovery-frontier.test.mjs lib/r11_1-frontier-execution.test.mjs
```

Code 0, quatre fichiers TAP passés. Aucun accès réseau pendant tests, aucun service/donnée personnelle touché. Les tests ne prouvent ni absence globale de cycles dans le générateur, ni pertinence musicale, ni dernier palier SOTA. Le gain établi est le comptage exact de chemins distincts dans le contre-exemple et ses huit variantes de route.

## Remobilisation : motif perdu dans le générateur

Défaut supplémentaire reproduit dans `lib/catalogue-graph.mjs` : le parcours BFS retenait le premier chemin vers un nœud, puis vérifiait seulement après coup la présence du motif remix/collaboration. Un chemin de crédits ordinaires pouvait donc masquer un chemin pourtant documenté contenant la relation requise. Les mêmes arêtes dans un ordre différent donnaient des découvertes différentes.

Fixture remix : A crédité sur T, B crédité sur T, T remixé par B, B crédité sur U. Avant, résultat `[]` si crédit B rencontré avant remix, `[U]` sinon. Fixture collaboration : A et C crédités sur T, A collaborant avec B, B avec C, C crédité sur U. Avant, `[]` contre `[T,U]` selon ordre. Toutes ces données sont synthétiques et ne prétendent pas mesurer pertinence humaine.

Correction autorisée après reproduction : parcours avec état `(nœud, motif déjà rencontré)`, uniquement pour remix et collaboration. Maximum deux états par nœud; limite de profondeur locale deux inchangée; premier chemin BFS satisfaisant conservé. Les autres directions et leurs prédicats ne changent pas. Les arêtes candidates/inférées/rejetées restent exclues par l'index. Un retour à la source à profondeur deux ne devient pas un nouvel artiste-ancre : les points de départ sont toujours exclus. Ce n'est pas un énumérateur de tous les chemins et les alternatives de même longueur peuvent encore départager leur preuve par ordre d'entrée.

Fondement primaire : [Output-Sensitive Evaluation of Regular Path Queries](https://arxiv.org/abs/2412.07729) décrit l'évaluation par produit graphe/automate. Nous reprenons le principe classique d'état de parcours, pas son algorithme OSPG, ses résultats ou du code sous licence tierce. Code local original, aucune dépendance.

Sauvegarde supplémentaire `/tmp/scout-catalogue-motif-w3-krLdcG/catalogue-graph.mjs`. Nouveau test `lib/catalogue-motif-order.test.mjs` : les 24 permutations remix produisent `[U]` avec la relation exacte dans la preuve; les 120 permutations collaboration produisent `[T,U]`; sept autres directions restent vides dans la fixture remix; absence/motif non sûr restent vides; le rôle producteur reste explicitement producteur dans l'explication et ne devient pas remixeur. Les doublons d'arêtes ne gonflent pas la longueur.

Validation : `node --test lib/catalogue-motif-order.test.mjs lib/catalogue.test.mjs lib/graph.test.mjs lib/catalogue-progression.test.mjs lib/r11-discovery-frontier.test.mjs lib/r11_1-frontier-execution.test.mjs` : six fichiers TAP passés, code 0. La première tentative mentionnait un fichier de test inexistant et n'a exécuté aucun test; commande corrigée ci-dessus. Aucun service activé. La suite existante pouvait être verte avant ce contre-exemple : succès des tests n'était pas preuve d'absence du défaut.

Revalidation finale : test de retour au départ par auto-remix et motif au-delà de deux sauts ajoutés, tous deux sans candidat artificiel; puis inclusion de `lib/catalogue-motif-oracle.test.mjs` écrit indépendamment par le coordinateur. Sept fichiers TAP passent, code 0. L'oracle compare 256 sous-graphes × deux directions × deux ordres, soit 1 024 comparaisons, à une énumération séparée des marches de longueur au plus deux. C'est une preuve adversariale sur petit graphe, pas une évaluation musicale indépendante.

Contrôle de sensibilité communiqué par le coordinateur : l'oracle échoue sur la baseline sauvegardée (`mask=7`, direction remix : ancre `b` attendue, liste vide obtenue), et passe sur le correctif. Il détecte donc bien le défaut préexistant, au lieu de seulement passer des deux côtés.
