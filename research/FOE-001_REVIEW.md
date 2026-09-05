# Revue de portefeuille — FOE-001

Date : 2026-09-05  
Décision : **passage borné** ; pas de passage vers l'intégration produit.

## Éléments observés

- Le protocole gelé et son fixture couvrent les sept variantes prévues.
- `test_foundations_of_evidence.py` passe : il distingue lignages indépendants,
  mode commun et lignage incomplet ; rejette une collision ; rend une extension
  explicite ; et classe une migration comme stable, déclarée ou inexpliquée.
- Les contrôles préexistants des quatre laboratoires restent exécutables.

## Limite décisive

Les quatre contrôles de FOE-001 sont actuellement implémentés dans un unique
orchestrateur sous `research/scripts/`. Aucun adaptateur FOE-001 séparé n'est
encore présent dans les laboratoires de provenance, migration sémantique ou
diversité épistémique. Le passage du test démontre donc un pipeline commun de
fixtures ; il ne démontre pas l'indépendance des implémentations, ni une revue
croisée effective entre ces laboratoires.

## Séparation et réplication exécutées

La séparation structurelle est exécutée : un adaptateur FOE-001 est présent
dans chacun des quatre laboratoires et l'orchestrateur les charge tous les
quatre. Le reçu déclare ces quatre dépendances. Le contrôle de portefeuille
rejoue désormais cette composition et passe.

Une seconde implémentation a ensuite été reçue dans
`foe_001_second_implementation/`. Ses quatre empreintes correspondent à celles
déclarées ; elle vérifie les empreintes des deux entrées gelées et ses cinq
tests passent. Son attestation déclare qu'elle n'a lu que les trois fichiers
autorisés. Cette attestation et les artefacts présents soutiennent une
réplication séparée pour le fixture, sans établir une indépendance externe
générale.

## Décision de portefeuille

Le résultat est `pipeline_verified` pour le fixture FOE-001 et ses deux
implémentations locales. Aucune intégration au Corpus Open Model ou à la
surface native n'est autorisée par cette seule revue.

La prochaine porte est la préparation d'un jeu de requêtes ambiguës,
adversariales et multilingues, fixé avant exécution, afin d'évaluer séparément
le modèle ouvert et la surface native. Toute future revue doit encore vérifier :

1. qu'aucun adaptateur ne perd le noyau de provenance ;
2. qu'un mode commun et un lignage incomplet ne deviennent jamais des preuves
   indépendantes ;
3. que les deux interpréteurs de migration restent séparés ;
4. que chaque dépendance de code et de fixture est inscrite dans le reçu.

Le paquet de reprise gelé est
[`FOE-001_SECOND_IMPLEMENTATION_BRIEF.md`](FOE-001_SECOND_IMPLEMENTATION_BRIEF.md).

Une future intégration ne peut être proposée que si ces conditions restent
observées dans les paquets de cette nouvelle campagne ; sinon elle est retirée.
