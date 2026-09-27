# Protocole comparatif Scout — 27 septembre 2026

## Statut

Protocole et calculateur écrits ; arithmétique testée uniquement sur données synthétiques. Aucun jugement humain collecté, aucun jeu externe téléchargé, aucun résultat de qualité réelle produit. Le benchmark comparatif reste à exécuter. Les fixtures inventées ne sont comparables ni à YouTube, ni à Spotify, ni à une population d'auditeurs.

## Fondements vérifiés

- Recherche : [Shani et Gunawardana, Evaluating Recommender Systems](https://www.microsoft.com/en-us/research/publication/evaluating-recommender-systems/) distingue expériences hors ligne, études utilisateurs et expériences en ligne. Une bonne mesure doit porter sur la propriété visée, pas seulement sur la disponibilité d'un score.
- Biais : [Recommendations as Treatments](https://www.microsoft.com/en-us/research/publication/recommendations-treatments-debiasing-learning-evaluation/) traite les biais de sélection. Un titre non écouté ou non affiché n'est pas automatiquement un jugement négatif.
- Acteurs : [Spotify 2025](https://research.atspotify.com/2025/9/generalized-user-representations-for-large-scale-recommendations) rapporte des évaluations hors ligne, ablations et expériences en ligne ; [YouTube Music 2026](https://arxiv.org/abs/2609.23877) rapporte des A/B tests sur la découverte expliquée. Leurs gains ne sont pas des seuils directement transportables à Scout.
- Open source : [RecBole](https://github.com/RUCAIBox/RecBole) propose plusieurs familles de modèles avec protocoles communs ; [Recommenders](https://github.com/recommenders-team/recommenders) fournit une autre référence de baselines et métriques. Les deux dépôts affichent MIT ; aucun de leurs fichiers n'est copié ici.

## Ce qui existe déjà localement

`scripts/discovery-quality-performance.mjs` compare les candidats et les temps de traitement sur un graphe fourni. C'est une mesure utile de non-régression et coût ; sans pertinence humaine, elle ne mesure pas une meilleure découverte musicale. Ce script n'a pas été exécuté sur une bibliothèque privée pendant cet audit.

Les tests `direction-mixer`, `music-sorting`, R11 et R11.1 vérifient invariants, tri et budget. Ils ne remplacent pas une comparaison de préférences musicales ou de précision documentaire sur cas tenus à part.

## Jeu tenu à part à constituer

Proposition arrêtée avant collecte, à valider avant l'expérience : 160 départs publics et légalement réutilisables, 20 par direction principale (label, remix, collaboration, compilation, alias/projet, chaîne, scène, période). Stratifier nom ambigu/non ambigu, artiste connu/peu documenté, fiche disponible/indisponible et plusieurs langues. Ne pas choisir uniquement des départs déjà réussis dans ce fil.

Séparer par famille d'artiste/enregistrement et date de capture : 80 développement, 40 validation, 40 test scellé (5 par direction). Ce petit test constitue un pilote, pas une certification mondiale. Les auteurs de correctifs ne doivent pas consulter les jugements test pour ajuster le moteur. Élargir ensuite selon variance et puissance observées, sans modifier les seuils après avoir vu les résultats.

Pour chaque départ : figer les identifiants admissibles, les réponses source autorisées, la date, le budget d'appels, le matériel, le mode de filtre et la version du moteur. Aucun appel supplémentaire ne peut avantager une baseline sans être comptabilisé. Exclure les relations créées après la date de capture de toutes les versions comparées.

Comparer : A moteur actuel gelé ; B ordre simple par relation puis profondeur ; C ordre aléatoire à graine fixe ; D candidat amélioré ; E baseline OSS seulement après adaptation et données autorisées. Un service commercial non accessible dans les mêmes conditions reste référence documentaire, pas concurrent battu.

## Jugements et métriques

Deux axes séparés : (1) validité du chemin et des rôles, justifiée par source ; (2) intérêt d'écoute, jugé par des personnes consentantes. Grades d'intérêt 0, 1, 2, 3 définis avant présentation, avec option non jugé. Anonymiser l'origine des propositions, randomiser les positions et documenter les désaccords. Aucun LLM ne fabrique les grades pour annoncer un succès.

Le calculateur pur `scripts/offline-ranking-metrics.mjs` exporte `evaluateRanking({rankedIds, eligibleIds, judgments, k, artistsById})` : nDCG@k à gain `2^grade - 1`, recall@k pour grade positif, couverture de jugement, exposition du catalogue gelé, nombre d'artistes distincts, couverture des métadonnées et abstention. Les doublons et IDs hors catalogue sont refusés. Sans jugements complets du catalogue gelé, nDCG et recall sont `null`, pas zéro ni estimation inventée. Sans pertinent connu dans un catalogue entièrement jugé, ces métriques restent indéfinies. Une abstention reçoit zéro seulement lorsque le catalogue entièrement jugé contient du pertinent.

Limite d'entrée : `judgments` est un objet à une note par identifiant. Des clés dupliquées dans un JSON brut ont déjà été écrasées par `JSON.parse` avant l'appel ; cet outil ne peut pas les détecter rétroactivement. Un futur importeur de jugements doit refuser ces doublons en amont ou utiliser des lignes distinctes avec validation d'unicité. Ne pas confondre cela avec les doublons de `rankedIds` et `eligibleIds`, effectivement rejetés ici.

La couverture du catalogue retournée concerne UNE requête ; pour une couverture globale, calculer l'union des IDs exposés sur le même catalogue figé. Le nombre d'artistes n'est pas une distance acoustique, une diversité culturelle ou une satisfaction utilisateur. Rapporter les métriques par direction, puis macro-moyenne avec nombre de cas définis ; ne pas cacher les abstentions ni les jugements manquants.

## Seuils futurs proposés, non résultats

Garde-fous avant promotion : aucun crédit faux introduit dans les cas sentinelles ; aucune identité fusionnée par simple nom ; conservation des corrections personnelles ; zéro requête privée non autorisée.

Sur test tenu à part : viser au moins +0,03 nDCG@10 absolu contre A, avec intervalle bootstrap apparié par départ à 95 % dont la borne basse dépasse zéro ; pas de baisse de recall@10 supérieure à 0,02 dans une direction ; couverture de jugement publiée ; latence p95 et coût par départ au plus +10 % à ressources égales. Ces valeurs sont un contrat de produit proposé, pas des constantes de l'état de l'art. Si le pilote est trop petit pour trancher, conclure « indéterminé » et élargir selon plan, pas « égalité prouvée ».

Pour prétendre dépasser une baseline externe : même corpus, mêmes exclusions, mêmes budgets et juges ; publication des erreurs et ablations. Pour prétendre égaler une plateforme mondiale : il faut un protocole réellement comparable et des données accessibles ; ce palier n'est pas établi par cet outil.

## Lot livré et résultat

Nouveaux fichiers seulement : calculateur et `tests/offline-ranking-metrics.test.mjs` (9 cas synthétiques : idéal, rang incorrect, manque de labels, abstention, doublons, entrées invalides, artistes, catalogue vide, métadonnées héritées). La revue croisée a repéré que les métadonnées artistes héritées du prototype pouvaient être comptées ; l'outil lit désormais uniquement les propriétés propres et valide la forme de la table artistes.

Exécuté : `node --test tests/offline-ranking-metrics.test.mjs`. Résultat code 0, rapport TAP 1 fichier réussi, 0 échec. Le runtime agrège par fichier ; cela ne constitue pas une mesure de la qualité du moteur.

Deuxième vérification séparée, via import pur Node et assertions : zéro pertinent, k supérieur à la liste, permutation d'ordre des jugements, notes Infinity/-Infinity/NaN et abstention totale. Résultat code 0 ; aucun défaut arithmétique trouvé dans ces cas. Vérification supplémentaire de clés JSON répétées : leur perte avant l'appel est confirmée et documentée ci-dessus. Aucun test de données humaines n'en découle.

## Grille de maturité de l'évaluation après ce lot

Échelle commune : 0 absent/non établi ; 1 partiellement écrit ; 2 tests historiques tracés ; 3 tests locaux ciblés courants ; 4 comparaison indépendante comparable. Les poids sont égaux et les critères figés ici ; il ne s'agit pas d'une probabilité ni d'une mesure du travail restant.

| Critère d'acceptation | Niveau | Justification |
|---|---:|---|
| Calcul des métriques, abstentions et jugements manquants correctement distingués | 3/4 | Contrats synthétiques exécutés et seconde vérification des cas limites ; limite des doublons JSON connue |
| Protocole scellé et exécutable identiquement pour les baselines | 1/4 | Protocole écrit, mais manifeste de corpus et adaptateurs communs pas encore constitués |
| Corpus tenu à part, grades humains et vérification documentaire indépendants | 0/4 | Aucun corpus jugé et scellé livré |
| Comparaison reproduite contre référence externe dans le même périmètre | 0/4 | Non réalisée |

Total : **4/16 = 25 % de maturité de preuve de l'évaluation**. L'outil existe et son arithmétique est testée ; la mesure de qualité du produit demeure à faire. Aucun niveau 4 et aucune parité SOTA établis.

Audit ultérieur à ne pas oublier : `lib/catalogue-graph.mjs` autorise `produced_by` dans le motif remix. Vérifier la sémantique et les libellés ; un crédit de production n'est pas en soi un remix. Aucun changement catalogue dans ce lot.
