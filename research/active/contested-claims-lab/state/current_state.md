# État courant

Ouvert. Le protocole initial est conservé et un contrôle supplémentaire sépare
survie individuelle, pluralité et compatibilité conjointe. Les conditions de
révision sont désormais exécutables dans trois espaces finis. Une mutation
d'entrée confirme que les identifiants dupliqués sont rejetés avant agrégation.

La v0.3 ajoute une famille synthétique non exhaustive et les deux permutations
d'une même paire de traces. Les deux ordres atteignent exactement `{A, C, D}` et
conservent le résidu non couvert `{D}`. Dans l'ordre restriction puis ajout,
`claim-beta` est temporairement contredit puis rouvert par recalcul complet. Le
rival à contradiction irréversible le maintient contredit : il perd uniquement
dans cette paire fermée, sans conclusion générale sur sa valeur hors de ce cas.

Le contrôle négatif rend les mondes finaux différents et est rejeté exactement
par `final_world_sets_differ`. Les tests v0.2 et v0.3 passent, et une contre-revue
fonctionnelle IA distincte a rendu `PASS` avant la rédaction documentaire.

Historique de développement, sans valeur de résultat scientifique : le nouveau
test a été raccordé à la table directe de statuts renvoyée par `evaluate`, puis à
son exigence d'un ensemble pour l'évaluation finale. Le contrôle négatif a été
isolé des trois trajectoires positives déclarées sans désactiver les contrôles
de traces, d'univers, les calculs par `apply_revision` ou l'invariant final.

Portée : `internal_synthetic_only`. Validité externe : `not_claimed`.
Indépendance : `independence_unknown`. Pré-enregistrement démontré : non.
Robustesse générale revendiquée : non.
