# Scout 0.20.0 — participants et qualité des propositions

## Périmètre

Correctifs issus des captures « Saboteur / Grünt #53 », Jolagreen23 et Cookin’ Soul. Architecture Scout conservée : identification, graphe de relations, catalogues puis mélange local. Ni analyse sonore ni nouvelle source externe. Aucune connexion Google déclenchée.

## Changements

1. **Plusieurs participants d’un morceau** : recherche de chaque nom, par lots de trois, sans la limite silencieuse à quatre noms. La requête collective reste proposée séparément, car certains séparateurs appartiennent à des noms de groupes. Une fiche par participant, plusieurs participants simultanément ; aucune identité précochée. Les autres noms et le titre restent conservés. Les fiches non équivalentes ne sont pas fusionnées par leur nom.
2. **Choix lisibles** : résultats regroupés par nom ; correspondances exactes et alias avant les autres homonymes. Une indisponibilité reste distincte d’une absence de fiche. Un lien catalogue peut compléter un participant sans perdre les autres choix. L’en-tête distingue les crédits renseignés des participants réellement explorés.
3. **Routage multi-artistes** : toutes les relations confirmées restent des départs du graphe. Un partenaire déjà connu du premier artiste n’empêche plus la lecture du catalogue du second. Les budgets existants restent bornés ; la disponibilité de toutes les branches en une seule recherche n’est pas garantie.
4. **Mélange équilibré** : lorsque la diversité est active et que toutes les directions sont affichées en sélection équilibrée, pas de remplissage forcé avec le même album ou partenaire. Une page peut être plus courte, avec explication et pagination. Une direction ciblée ou une diversité nulle permet de parcourir les autres pistes. Les variantes d’une même session Grünt numérotée sont espacées dans la page, sans fusion d’identités.
5. **Nature des vidéos** : marqueurs explicites d’entretien/documentaire et d’annonce promotionnelle masqués par défaut, avec deux filtres réversibles. Les vidéos non classables restent visibles. Les indications sont « probables », jamais une classification certaine. Le bouton vidéo n’affirme plus qu’il s’agit nécessairement d’un morceau.
6. **Noms et chemins** : les noms lisibles dans certains formats de titre sont proposés pour vérification, pas transformés en identités catalogue. Une chaîne de diffusion n’est pas automatiquement l’interprète. Les cartes donnent le chemin de relations et précisent lorsqu’il passe par la discographie d’un participant plutôt que par un crédit du morceau initial.
7. **Sauvegarde** : les lots de décisions personnelles sont préparés à part, sérialisés et publiés en mémoire après écriture durable. Une panne ne peut plus laisser un lot refusé être enregistré lors de la décision suivante. Le stockage temporaire des résultats et du cache catalogue conserve son fonctionnement antérieur.

## Vérifications

- Suite complète : `node --test --test-reporter=tap server.test.mjs lib/*.test.mjs public/*.test.mjs tests/*.test.mjs` — 717 tests passants sur le code final, après adaptation du test de version et du banc de test au nouvel en-tête.
- `npm run check` — réussi ; modules nouveaux contrôlés séparément.
- Tests ajoutés : sept participants dont le dernier, concurrence bornée, changement de départ, crédits longs, choix de plusieurs identités, annulation d’un sous-ensemble, révisions, échec disque, décisions concurrentes, racines multiples, diversité et accès aux pistes restantes, filtres réversibles, indices de titre, chemins explicites.
- HTTP isolé : trois identités et tous les crédits relus après redémarrage ; autre départ isolé et archive historique inchangée.
- Navigateur intégré, données fictives : choix indépendants, recherche répétée, panne de sauvegarde, ajout d’une fiche par lien, conservation des crédits complets, filtres de contenu, page équilibrée courte et pagination ciblée 6 puis 2 pistes. Le banc exécute le formulaire réel extrait du code ainsi que le panneau de mélange réel ; il ne remplace pas une validation musicale en conditions réelles.

## Limites et recette utilisateur

Les catalogues peuvent manquer d’artistes ou de crédits. La diversité ne crée pas de nouveaux artistes si les sources chargées n’en contiennent qu’un. Les indices textuels de contenu peuvent se tromper ; les filtres permettent de revoir les éléments masqués. La famille de session repérée couvre le format numéroté Grünt observé dans les captures, pas toutes les chaînes.

Après activation et rechargement : ouvrir le même morceau, vérifier les noms proposés, sélectionner plusieurs participants puis explorer. Vérifier les chemins, écouter les propositions et signaler les rapprochements musicalement insatisfaisants. Cette appréciation finale revient à l’utilisateur ; les tests techniques ne prouvent pas la pertinence sonore.

## Activation

Préparée séparément de l’application active. L’activation nécessite sauvegarde, contrôle des empreintes des fichiers de départ, autorisation de redémarrage et vérification de la version servie. Aucun résultat de test ne vaut preuve d’activation.
