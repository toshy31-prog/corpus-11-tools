# Réutilisation découverte — vague 2 — 27 septembre 2026

## Décision et portée

Ne pas ajouter MMR/xQuAD au moteur sans contre-exemple bénéfique démontré. Le code possède déjà une sélection marginale pénalisant la répétition d'artistes (`discovery-model.mjs`), un entrelacement pondéré et des plafonds artiste/album/intermédiaire (`scout-mix-session.mjs`). Le classement produit par `mixDirectionGroups` est indexé par ID avant sélection des files : modifier uniquement cet ordre global ne diversifierait pas la page. Ses scores et routes restent utiles; ce n'est pas du code déclaré inutile.

Le gain livré est un contrat de non-régression transversal avec le **vrai sélecteur**, et non une nouvelle prétention de qualité musicale. Aucun fichier du moteur modifié dans cette vague; aucun besoin de sauvegarder/remplacer un fichier existant. Le correctif de provenance de vague 1 demeure séparé.

## Mécanismes externes examinés

- Recherche : [xQuAD, thèse originale de Santos, Glasgow](https://theses.gla.ac.uk/4106/) combine couverture d'aspects, nouveauté marginale et arbitrage pertinence/diversité. Évaluation web TREC, pas découverte musicale personnelle. Réutilisable : protocole comparatif à budget égal et mesure de couverture. Aucun modèle ni code copié.
- Acteurs : [Google, ranking multitâche YouTube](https://research.google/pubs/recommending-what-video-to-watch-next-a-multitask-ranking-system/) sépare plusieurs objectifs du ranking. Les objectifs et données industrielles ne sont pas les nôtres : ne pas assimiler poids de directions et probabilité d'intérêt.
- OSS : [Troi de MetaBrainz](https://github.com/metabrainz/troi-recommendation-playground) propose des pipelines de playlists et des échanges entre catalogues, sous GPL-2.0. Principe retenu : séparer génération, filtrage et sélection. Aucun import, dépendance ou copie GPL; une incorporation future exige revue de compatibilité.

Les huit voies et références spécifiques restent dans `SOTA_DISCOVERY_2026-09-27.md`. Les sources de cette vague ne prouvent pas un nouveau record mondial ni une équivalence plateforme.

## Comparaison SYNTHÉTIQUE exécutée

Fixture entièrement artificielle : huit directions, douze candidats distincts par direction, identités explicites, aucun jugement humain. Budget identique de 24 cartes, quatre pages de six.

| Mesure | Concaténation fixe des files | Scout actuel |
|---|---:|---:|
| Cartes exposées / 96 admissibles | 24 / 96 | 24 / 96 |
| Directions exposées | 2 / 8 | 8 / 8 |
| Artistes distincts | 24 | 24 |
| Répétitions de cartes | 0 | 0 |
| nDCG / pertinence humaine | non mesurable | non mesurable |

Cette baseline est volontairement simple et non concurrente SOTA. Le gain de couverture reflète la construction de la fixture, pas un gain moyen réel. Scout effectue 32 appels de sélection **locaux**, un par direction/page; aucun appel catalogue. Le coût CPU comparatif n'a pas été benchmarké et la fixture ne constitue pas une mesure de latence production.

Contrats supplémentaires : chacune des huit directions est exclue tour à tour sans réactivation; chacun des huit focus reste exclusif; statut `candidate`, preuves et entrées restent inchangés. Les directions vides, identités ambiguës, pertinence variable et catalogues corrélés demandent un jeu tenu à part avant adoption d'un algorithme supplémentaire.

## Validation

Commande isolée, sans réseau/service/données personnelles :

```sh
node --test public/discovery-diversity-contract.test.mjs public/direction-mixer.test.mjs public/music-sorting.test.mjs public/scout-mix-session.test.mjs
```

Résultat : code 0, quatre fichiers TAP réussis; deux nouveaux cas de contrat (dont les boucles sur huit directions). Aucune activation navigateur ni évaluation indépendante. Le palier comparable à l'état de l'art reste **non démontré**. Le prochain progrès discriminant est un benchmark à pertinence jugée légitimement, non une couche de ranking ajoutée pour son nom.
