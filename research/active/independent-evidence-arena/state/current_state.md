# État courant

La porte synthétique initiale est conservée. Quatre DAG tracent données,
générateurs, seeds, codes et oracles par identité et empreinte déclarée; ils
distinguent mode commun, séparation partielle et séparation procédurale fictive.
La séparation ne vaut que sous l'exhaustivité et l'exactitude des empreintes de
la fixture. Aucun effet décisionnel hors de ces mondes n’est établi.

La campagne transversale `FOE-001` est désormais gelée et testée sur sept
variantes fictives : lignages indépendants, mode commun, lignage incomplet,
collision, extension et migrations déclarée ou inexpliquée. Le test distingue
`independent`, `shared_failure_mode` et `independence_unknown`, rejette une
collision et localise les dérives. Sa portée reste `pipeline_verified` pour
ces fixtures et ces deux profils locaux.

La revue de portefeuille conclut un `passage_borné` : les quatre adaptateurs
sont séparés, et une seconde implémentation locale a reproduit les résultats
sur les entrées gelées. Voir
[`../../../FOE-001_REVIEW.md`](../../../FOE-001_REVIEW.md).

Prochaine décision : préparer avec les dossiers produit un jeu de requêtes
pré-enregistré, ambigu, adversarial et multilingue ; il évaluera séparément le
modèle ouvert et la surface native sans autoriser leur intégration.
