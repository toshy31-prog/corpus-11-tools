# Vérification post-exécution des expressions v0.4

- Date du contrôle : `2026-09-09T01:05:49Z`
- Campagne observée : `CCCL-OE-004`
- Portée : `internal_synthetic_only`
- Validité externe : `not_claimed`
- Indépendance : `independence_unknown`
- Vérificateur : `tests/verify_observational_equivalence_v0_4_post_execution.py`
- SHA-256 du vérificateur : `d2ed87dc43015e412c2ed8b25da914855fa09ad57ed33e9fe9939665028a208e`
- Position temporelle : vérification écrite et exécutée après l’exécution v0.4

## 1. Cohérence mathématique vérifiée après exécution

Le vérificateur est une implémentation séparée : il n’importe pas et n’exécute pas le harnais scellé v0.4. Il ne lit ni le résultat tenu à l’écart, ni le reçu pour reconstruire les équations. Il accepte une grammaire fermée sans `eval` : projection d’une variable, opérateurs binaires `OR` et `AND`, indicatrice de seuil, et appel d’une fonction finie explicitement enregistrée.

Pour chaque équation, il parse l’affectation, reconstruit une représentation canonique de la partie droite, vérifie que ses variables sont exactement les parents déclarés, vérifie que la table couvre sans doublon le produit cartésien des domaines présents, puis compare exhaustivement la valeur reconstruite à chaque ligne de table.

Résultat positif exact :

`PASS v0.4 post-execution expression verifier: 4 equations exact, negative contradiction rejected`

Couverture observée :

- `OR-noise-positive / X` : `U_X`, 2 lignes égales ;
- `OR-noise-positive / Y` : `X OR U_Y`, 4 lignes égales ;
- `latent-selection-negative / X` : `1[U >= 2]`, 4 lignes égales ;
- `latent-selection-negative / Y` : `f_Y(X,U)`, 8 lignes égales.

Pour `f_Y`, le vérificateur rend explicite la fonction finie `1[U >= 2 ou (U = 1 et X = 0)]`, puis montre son égalité avec les huit lignes. Cette sémantique explicite est ajoutée par le vérificateur post-exécution ; elle n’était pas développée dans le champ textuel scellé.

Test négatif exécuté sur une copie en mémoire, sans modifier la fixture : l’expression `Y := X AND U_Y`, syntaxiquement autorisée et portant les mêmes variables, contredit la table gelée. Sortie exacte :

`EXPECTED FAIL negative expression/table contradiction: OR-noise-positive/Y: expression/table contradiction at {'X': 0, 'U_Y': 1}: expression=0, table=1`

Code de sortie observé : `1`, comme attendu.

Conclusion bornée : les quatre expressions v0.4 peuvent être associées après exécution à des fonctions explicites exactement égales aux tables gelées. Le test négatif démontre que le vérificateur ne se contente ni du nom de la cible, ni de la liste des parents.

## 2. Pré-enregistrement non rétroactivement réparable

Ce contrôle ne modifie aucun octet v0.3 ou v0.4 et reste hors de la liste scellée v0.4. Il ne change donc ni le manifeste, ni le sceau, ni le harnais qui a passé la porte avant exécution.

La lacune constatée par la première contre-revue demeure un fait historique : au moment de la porte pré-exécution, le harnais scellé ne démontrait pas la sémantique complète des parties droites. La vérification présente apporte une cohérence mathématique postérieure ; elle ne peut pas devenir une preuve pré-enregistrée, antidatée ou intégrée rétroactivement au sceau.

En particulier, la définition explicite de `f_Y` appartient au vérificateur postérieur. Son égalité avec la table est démontrée, mais son absence du contrat scellé n’est pas effacée.

## 3. Unicité bornée à la commande observée dans cette tâche

Une seule commande v0.4 `--execute` a été observée dans cette tâche. Elle a créé le reçu existant avec `execution_count: 1`. La création exclusive du reçu empêche une nouvelle création tant que ce reçu existe.

Cette trace ne prouve pas une unicité historique absolue. Elle n’exclut pas une exécution antérieure interrompue avant reçu, un reçu antérieur supprimé, ni une exécution extérieure au journal disponible. La conclusion exacte est donc : **une commande d’exécution réussie observée dans cette tâche, sans nouvelle exécution pendant le présent correctif**.

## Statut du correctif

- proposé : oui ;
- écrit : oui ;
- test négatif : exécuté, échec attendu observé ;
- vérification positive : exécutée, PASS ;
- scénario causal nouveau : non exécuté ;
- pré-enregistrement v0.4 réparé : non, impossible rétroactivement ;
- committé : non ;
- publié : non ;
- installé : non ;
- réobservé comme produit : non.
