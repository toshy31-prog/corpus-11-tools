# Découverte musicale : état vérifié au 27 septembre 2026

## Conclusion et périmètre

Scout possède un moteur de parcours explicables à huit directions, un mélange pondéré, des filtres d'artistes et une frontière budgétée. Cela constitue une base fonctionnelle, pas une preuve de parité avec les meilleurs recommandateurs. Aucun benchmark commun indépendant n'a été établi ici. Les publications industrielles exposent des fragments de systèmes et des résultats sur leurs données ; elles ne donnent ni un accès à leurs moteurs complets ni une cible unique « 100 % SOTA ».

Inspection : `lib/catalogue-graph.mjs`, `public/direction-mixer.mjs`, `public/music-sorting.mjs`, `public/discovery-frontier.mjs` et leurs tests ciblés. Aucune donnée personnelle transmise, aucune dépendance installée, aucun service redémarré.

## Recherche, plateformes et logiciels ouverts

Sources primaires consultées par navigation publique aujourd'hui. Les dates suivantes sont celles des publications, pas des dates approximatives de l'index de recherche.

- **Recherche, chemins typés** : [KPRN, AAAI 2019](https://arxiv.org/abs/1811.04540) représente les séquences d'entités et relations et pondère plusieurs chemins ; évalué notamment sur des données musicales. Il ne valide pas les crédits collectés par Scout. [Qualité des chemins explicatifs, 2022](https://arxiv.org/abs/2209.04954) distingue qualité de l'explication et seule pertinence du produit.
- **Google/YouTube** : [classement multitâche, 2019](https://research.google/pubs/recommending-what-video-to-watch-next-a-multitask-ranking-system/) documente l'optimisation multi-objectifs. Plus récent, [YouTube Music, prépublication du 20 septembre 2026](https://arxiv.org/abs/2609.23877) décrit des ensembles d'artistes et raisons personnalisées calculés hors ligne, servis sans inférence LLM synchrone. Les auteurs rapportent des A/B tests ; ce n'est pas une réplication indépendante ni une preuve qu'un texte généré est factuellement juste.
- **Spotify** : [représentations utilisateurs, RecSys 2025](https://research.atspotify.com/2025/9/generalized-user-representations-for-large-scale-recommendations) combine signaux acoustiques, collaboratifs et fenêtres temporelles, avec cohérence des versions d'embeddings. [MUSIG, ISMIR 2021](https://research.atspotify.com/multi-task-learning-of-graph-based-inductive-representations-of-music-content) exploite structure des playlists, audio et genres. Ces mécanismes inspirent un modèle hybride ; les données et modèles de production ne sont pas fournis à Scout.
- **Amazon Music** : [recommandation contextuelle, 2021](https://www.amazon.science/publications/a-scalable-model-for-online-contextual-music-recommendations) sépare choix d'une facette et classement des contenus. C'est un analogue utile aux directions Scout, pas une évaluation des huit relations précises de Scout.
- **Tencent, Chine** : [TAAC 2025, papier soumis le 4 avril 2026](https://arxiv.org/abs/2604.04976) publie un protocole et des jeux de données pour recommandation générative multimodale publicitaire. Transférable : protocoles d'évaluation et séparation clic/conversion ; non transférable sans validation : performance musicale ou véracité de crédits. Ce n'est pas QQ Music et ne doit pas être présenté comme tel.
- **Microsoft / écosystème ouvert** : [Recommenders](https://github.com/recommenders-team/recommenders), [licence MIT](https://github.com/recommenders-team/recommenders/blob/main/LICENSE), fournit modèles, exemples et évaluation. [RecBole](https://github.com/RUCAIBox/RecBole), [MIT](https://github.com/RUCAIBox/RecBole/blob/master/LICENSE), est un candidat pour comparer des baselines sur un jeu autorisé. Importer une bibliothèque ne vaut pas supériorité.
- **MetaBrainz** : [Troi](https://github.com/metabrainz/troi-recommendation-playground) propose des pipelines de playlists, plusieurs sources et résolution vers une collection locale ; dépôt affiché GPL-2.0. [ListenBrainz](https://listenbrainz.readthedocs.io/en/latest/users/api/recommendation.html) documente la recommandation collaborative. Reprendre l'architecture ou interopérer est envisageable ; copier du code exige examen des obligations GPL et des licences des données. Pas d'import effectué.

Cette couverture internationale n'est pas exhaustive. Aucune comparaison primaire suffisamment précise n'a été établie ici pour Apple, Meta, Alibaba ou ByteDance sur chacune des huit directions ; aucune parité n'est inférée de cette lacune.

## Les huit directions, sans substituer similarité et relation documentaire

La [taxonomie MusicBrainz](https://musicbrainz.org/relationships) et son [guide des crédits](https://musicbrainz.org/doc/Artist_Relationship_Guide_for_Artists) fournissent un référentiel public de relations, pas un classement universel de recommandations. Les références transversales ci-dessus s'appliquent à l'exploitation et à l'évaluation des chemins ; aucune ne démontre à elle seule un meilleur système par direction.

| Direction Scout | Référence recherche / plateformes | Référence ouverte et mécanisme réutilisable | Écart ou critère décisif |
|---|---|---|---|
| Labels | Chemins typés KPRN ; facettes Amazon, pas benchmark label spécifique | MusicBrainz : label, sortie, enregistrement séparés | Mesurer les recommandations acceptées hors artiste initial ; un grand label commun n'est pas une proximité sonore |
| Remixeurs | KPRN pour sémantique des arêtes ; aucun benchmark industriel remix isolé vérifié | MusicBrainz distingue remixer, recording et original | Ne pas convertir tout producteur en remixeur ; auditer précision des rôles |
| Collaborations | Qualité des chemins explicatifs ; aucun A/B public sur ce motif exact vérifié | Crédits typés MusicBrainz, relations artistes | Un crédit technique n'est pas nécessairement un featuring ; audit manuel aveugle des chemins |
| Compilations | MUSIG étudie co-occurrence de playlist, différente d'une compilation éditoriale | MusicBrainz sortie/compilation ; Troi agrégation de sources | Préserver cette différence et éviter de compter les rééditions comme découvertes indépendantes |
| Alias et projets | KPRN ; aucune référence industrielle comparative pour alias exact vérifiée | Relations de groupes/membres et identifiants MusicBrainz | Ne pas confondre même personne, alias, membre et projet ; interdire fusion par nom |
| Chaînes YouTube | Google classement multitâche et découverte expliquée 2026 | Pipeline multi-source Troi, mais API YouTube distincte | Une chaîne commune est un lien éditorial, non un crédit ; mesurer rendement par appel et précision après filtrage |
| Scènes | Spotify genre/contexte et Amazon facettes : analogues, pas preuve de scène documentée | Taxonomie MusicBrainz et relations localisées sourcées | Pays ou genre ne suffisent pas à établir une scène ; conserver l'incertitude |
| Période | Spotify fenêtres d'intérêt : temps utilisateur, distinct de date musicale | Dates MusicBrainz ; tri musical local Scout | Date d'upload interdite comme substitut de sortie ; période seule ne doit pas créer une relation |

Lecture locale : `catalogue-graph.mjs` différencie les directions, restreint les territoires à du contexte et rattache la période à des routes documentées. Point à auditer avec le propriétaire catalogue : le motif remix accepte actuellement `produced_by` ou `remixed_by`. Il ne faut pas revendiquer une précision de rôle avant revue des libellés et fixtures correspondants.

## Réemploi priorisé (« vampiriser » sans importer les défauts)

1. **Tout de suite :** garder collecte, filtrage, classement et explication séparés ; dédupliquer les observations répétées sans effacer les chemins différents. Patch effectué ci-dessous, sans dépendance externe.
2. **Prochain palier mesurable :** corpus de départs gelé couvrant chacune des huit directions, noms ambigus et absence de fiche ; jugements à l'aveugle, baseline du moteur actuel, seuils arrêtés avant comparaison. Mesurer précision des crédits et des chemins, taux de découverte utile, couverture d'artistes, répétition et coût par piste acceptée. Des métriques de ranking seules ne certifient pas la justesse des métadonnées.
3. **Après autorisation de données/modèles :** comparer RecBole/Recommenders ou ListenBrainz en voie supplémentaire, avec provenance de recommandation collaborative distincte des relations musicales. Ne pas entraîner sur l'historique privé ni l'envoyer à un fournisseur sans accord.
4. **Après benchmark :** pré-calculer de courtes explications depuis chemins sourcés (analogue à la séparation hors ligne/en ligne YouTube Music), puis comparer compréhension et utilité à l'explication détaillée actuelle. LLM facultatif ; aucune nécessité de génération pour verbaliser un chemin typé.

## Échelle d'avancement de cette voie, pas pourcentage de supériorité

Barème local ordinal : 0 absent/non établi ; 1 partiellement écrit ; 2 test historique tracé ; 3 test ciblé courant ; 4 évaluation comparative indépendante. Poids égaux, quatre critères ci-dessous. Cette convention mesure la maturité de preuve, pas la fraction du travail restant. Un 0 de comparaison signifie « non établi », pas « système sans valeur ».

| Critère d'acceptation | Niveau après ce lot | Preuve et limite |
|---|---:|---|
| Une cible conserve les chemins distincts et n'accumule pas les replays exacts | 3/4 | Nouveau test de replay, chemins différents, preuves différentes et non-mutation, exécuté localement |
| Budget réparti entre directions exécutables, plafond et indisponibilités respectés | 3/4 | Suites frontière R11/R11.1 exécutées ; fixtures, pas fournisseurs réels |
| Mélange, tri et filtre restent déterministes sans promouvoir une identité | 3/4 | Suites direction-mixer et music-sorting exécutées ; ne couvre pas toute l'intégration navigateur |
| Utilité, fidélité des relations et diversité au moins au niveau d'une baseline externe sur huit directions | 0/4 | Aucun corpus indépendant et aucun comparatif courant |

Indice de maturité de preuve : **9/16 = 56,25 %**, affichable arrondi à **56 %** uniquement avec ce dénominateur. Pas « 56 % du SOTA », pas « 56 % du projet entier ». Les huit directions ne sont pas chacune validées par ces seuls tests transversaux.

## Changement et vérification

- Modifié `public/discovery-frontier.mjs` : convergence idempotente pour une même cible, direction, signature et chemin complet, incluant les preuves. Les chemins ou preuves différents restent conservés ; aucune identité du graphe fusionnée.
- Ajouté `public/discovery-provenance.test.mjs` : trois cas ciblés.
- Sauvegarde antérieure : `/tmp/scout-discovery-sota-1HwmTi/discovery-frontier.mjs`.
- Commande exécutée dans le projet : `node --test public/discovery-provenance.test.mjs public/direction-mixer.test.mjs public/music-sorting.test.mjs lib/r11-discovery-frontier.test.mjs lib/r11_1-frontier-execution.test.mjs`.
- Résultat observé : code 0 ; rapport TAP 5 fichiers réussis, 0 échec. Ce runtime rapporte les fichiers, donc ne pas présenter « 5 » comme le nombre de cas unitaires individuels.
- Non effectué : activation navigateur, test réseau, benchmark externe ou test utilisateur indépendant. Le skill change-validation impose de maintenir ces distinctions ; le patch n'est pas une certification SOTA.
