# Découverte W5 — explication plus courte, à portée égale

## Résultat borné

Un défaut réel de sélection des chemins a été reproduit : la première route d'une cible était conservée même lorsqu'une route documentaire plus courte, de même catégorie, était trouvée ensuite. Le classement utilise notamment la longueur du chemin ; ce choix pouvait donc affecter l'explication et son classement. Ce lot corrige ce cas, sans nouveau modèle ni dépendance.

Fixture synthétique, non jugement humain : départ A, identité intercatalogue confirmée B, labels L1/L2, sortie S, cible X. Avant : A→T→R→L1→S→X (5 relations). Après : A→B→L2→S→X (4 relations). Les deux chemins sont sourcés ; aucune identité n'est promue par le correctif.

`lib/catalogue-graph.mjs` remplace une candidature déjà retenue seulement si le chemin est strictement plus court, si `relationship.kind` est identique et si la présence d'une relation `probable_artist` est identique. Un label large ne remplace donc pas une route de label ordinaire, même plus court. Les égalités gardent le comportement antérieur. Ce n'est ni une optimisation globale de qualité des explications, ni une conservation exhaustive des chemins.

## Validation

Sauvegarde préalable : `/tmp/scout-discovery-w5-mtX0qs/catalogue-graph.mjs`.

Nouveau `lib/catalogue-shortest-route.test.mjs` : route plus courte sous deux ordres d'arêtes et sans mutation des données ; route large plus courte non promue ; identités candidate/inferred/rejected_user non utilisées. Les fixtures sont explicitement synthétiques.

Commande exécutée :

```sh
node --test lib/catalogue-shortest-route.test.mjs lib/catalogue-motif-order.test.mjs lib/catalogue-motif-oracle.test.mjs lib/catalogue.test.mjs lib/discovery-quality.test.mjs lib/catalogue-progression.test.mjs public/music-sorting.test.mjs
```

Résultat : code 0, 7 fichiers TAP réussis, aucun échec. Ni performance supplémentaire mesurée, ni effet observé dans le service en cours, ni pertinence humaine démontrée. La création d'une candidature avant comparaison peut ajouter du travail pour les doublons ; coût non mesuré.

## Sources et transfert

- Chercheurs : [Balloccu et al., 2022](https://arxiv.org/abs/2209.04954) distinguent qualité des chemins explicatifs et pertinence des recommandations. Le papier étudie notamment récence, popularité et diversité ; il ne prouve pas que le chemin le plus court est toujours meilleur. Ici la longueur applique un contrat déjà présent dans Scout.
- Industrie : [YouTube Music, septembre 2026](https://arxiv.org/abs/2609.23877) décrit des recommandations et justifications précalculées hors ligne, avec résultats A/B déclarés par les auteurs. Transfert possible : séparer sélection et explication ; pas de réplication de leurs gains, pas d'import de leur système LLM.
- OSS : [Recommenders, licence MIT](https://github.com/recommenders-team/recommenders/blob/main/LICENSE) est une option de comparaison future, non une dépendance ajoutée. Aucun code externe copié dans ce correctif.

La matrice huit directions et ses sources primaires chercheurs/industrie/OSS restent dans `SOTA_DISCOVERY_2026-09-27.md` : labels, remixeurs, collaborations, compilations, alias/projets, chaînes, scènes, période. Elle distingue explicitement les analogues transversaux des références portant sur le motif exact. Aucun benchmark industriel isolant chacune des huit voies n'a été vérifié : cette absence interdit de prétendre atteindre un SOTA par voie. Le lot W5 renforce la sélection documentaire, pas la recommandation personnalisée industrielle.

Prochain contrôle utile : parcours sans fiche et filtrage, en lecture/revue UX pendant le gel d'intégration. Comparaison humaine aveugle toujours nécessaire pour établir l'utilité réelle des découvertes.
