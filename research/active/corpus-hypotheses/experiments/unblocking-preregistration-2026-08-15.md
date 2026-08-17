# Préenregistrement : tests de déblocage

## Statut et ordre

Ce document est écrit avant l'exécution des nouveaux calculs. Il fixe les familles candidates, les observables primaires, les contrôles et les conditions d'échec. Les calculs restent des résultats de modèles finis, jamais des données physiques.

## Génération indépendante des candidats

Les candidats suivants viennent uniquement des questions ouvertes du registre.

### Désinscription

1. pannes simultanées de plusieurs liens ;
2. délais sous ordres asynchrones d'intervention ;
3. changement du nombre et de la position des ports d'effacement.

Le premier candidat est retenu parce qu'il prolonge exactement le protocole déjà exécuté sans changer l'opération locale. Le test primaire cherche deux arbres enracinés appariés sur largeur, travail, degrés, excentricité et profil complet des pertes d'un lien, mais séparés par le profil des pertes de deux liens. Échec : aucune paire sur sept sommets. Portée maximale en cas de succès : le profil à une panne ne détermine pas la robustesse à deux pannes ; aucune nouveauté au-delà d'un invariant de coupes n'est alors revendiquée.

### Orientation compositionnelle

1. magmas finis non isomorphes à leur opposé ;
2. cocycles orientés sur groupes finis ;
3. hypergraphes ternaires orientés.

Le premier candidat est retenu comme test minimal sans coordonnées externes. Tous les magmas étiquetés d'ordre trois seront énumérés. L'observable primaire est l'existence d'une table non isomorphe à sa table opposée, propriété invariante par renommage. Les contrôles appariés sont la table opposée, le nombre d'idempotents, les fréquences de sortie, les profils symétrisés des translations et le nombre de triplets associatifs. Échec : tous les magmas d'ordre trois sont auto-opposés. Un succès établirait seulement deux secteurs relatifs échangés par opposition, pas une flèche temporelle physique ni un signe absolu.

### Frustration temporelle

1. tournois finis ;
2. hypergraphes orientés à trois places ;
3. contraintes issues d'une composition partielle.

Le tournoi est retenu comme contrôle minimal. Tous les tournois sur six sommets seront énumérés. `F_T` est le nombre minimal d'arêtes dirigées vers l'arrière parmi tous les ordres linéaires, divisé par quinze. Le test cherche deux tournois appariés sur séquence de scores et nombre de triangles cycliques mais ayant des `F_T` différents. Échec : aucune paire. Un succès montrerait que ces statistiques locales ne déterminent pas la frustration globale ; il ne ferait pas de `F_T` une grandeur temporelle physique.

### Invariants de factorisation

1. matrices de permutations signées ;
2. raffinements de partitions ;
3. transports provenant d'automorphismes de graphes.

Les matrices signées sont retenues pour permettre un calcul exact. Les triplets de matrices en dimension trois seront énumérés. Le test primaire cherche deux triplets appariés sur les dimensions fixes marginales et sur les dimensions de toutes les intersections deux à deux, mais séparés par la dimension de l'intersection triple. Échec : aucune paire dans cette famille. Un succès établirait un reste d'ordre trois non déterminé par les résumés d'ordre un et deux, sans interprétation objectale automatique.

### Complexe fini de distinctions compatibles

1. complexe cyclique de huit distinctions ;
2. union de deux cycles de quatre distinctions ;
3. complexe issu d'une famille de sous-ensembles à intersections imposées.

Les deux premiers candidats sont retenus comme paire minimale appariée sur huit sommets, huit liens et degré deux. Le modèle doit donner intégralement les sommets, liens, orientations et transports avant calcul. Les observables sont : frustration exacte des orientations, dimension d'un espace fixe commun et défaut de fermeture des compositions locales. Le résultat primaire est négatif si une différence est déjà imposée par la connexité, l'orientation ou les transports d'entrée. Lever la suspension exige toujours un résultat non injecté et absent d'un contrôle apparié ; l'exécution d'un modèle complet ne suffit pas.

## Observables empiriques compilés

Le seul terrain immédiatement testable est un système d'information distribué contrôlé. Pour chaque essai : état avant, écriture d'un bit, porteurs accessibles, protocole de lecture, protocole d'effacement, temps, nombre d'opérations, énergie si mesurable, pannes injectées, traces encore réactivables et état contrefactuel final. Les fenêtres et seuils doivent être fixés avant mesure.

Aucun canal, capteur, échelle, seuil de bruit ou protocole ne relie actuellement ces observables à l'émergence du temps physique. L'absence de résultat physique reste donc inconnue, non négative.

## Conditions générales de décision

- Un résultat absorbé par un invariant standard borne l'hypothèse au lieu de la confirmer.
- Une propriété créée directement par les entrées n'est pas émergente.
- Un succès isolé n'établit pas la robustesse ; il doit survivre aux renommages et aux contrôles déclarés.
- Les résultats numériques du jouet historique à huit triplets ne seront ni inventés ni déclarés reproduits tant que sa spécification manque.
