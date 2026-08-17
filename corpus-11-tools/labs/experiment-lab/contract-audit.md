# Audit du contrat du moteur

Référence auditée : `core/` au commit `6a6d64543f85f92832a782d2cad55057d7ffa42d` (empreintes identiques au jalon `ab5c76f`).

## Résultat

Le cœur ne contient aucun concept de récupération, effacement, trace, graphe, tournoi, frustration, temps, matrice, factorisation ou intersection. Il ne dépend d'aucun module et n'importe que ses propres utilitaires.

Le contrat suffit au module `factorization-invariants` sans modification : son état matriciel est clonable, ses transformations de représentation sont des perturbations, ses calculs de dimensions sont des observations isolées et ses comparaisons appariées sont des contrôles.

## Dépendances génériques nécessaires

1. L'état, les entrées et les résultats doivent être compatibles avec `structuredClone` et la sérialisation canonique du moteur.
2. Les gestionnaires sont synchrones ; le matériel ou les calculs asynchrones exigeraient une évolution générique ultérieure.
3. Opérations et perturbations peuvent muter l'état ; observateurs et critères reçoivent une copie et ne peuvent modifier l'expérience vivante.
4. La classe d'observateur est déclarée, mais `allowedOperations` et `maxSteps` ne sont pas automatiquement appliqués par le cœur. Chaque module doit actuellement les faire respecter dans ses procédures scientifiques.
5. Le moteur ne garantit aucune exactitude numérique de domaine. Le module doit fournir son propre calcul exact, sa tolérance ou ses bornes d'erreur.
6. Le journal séquentiel est une provenance d'exécution. Aucun module ne doit le transformer en variable scientifique sans le déclarer comme entrée.

## Risques qui imposeraient de rouvrir le cœur

- besoin démontré d'opérations asynchrones ou matérielles ;
- besoin d'appliquer centralement un budget d'accès adversarial ;
- état non clonable ou flux trop grand pour une copie complète ;
- preuve qu'une observation doit modifier physiquement l'état plutôt que passer par une opération déclarée.

Aucun de ces cas n'est requis par le troisième module. Le cœur reste donc gelé.
