# Protocole : modèle fini de distinctions compatibles

## Statut

Protocole préenregistré, puis exécuté sur une première paire minimale de complexes à huit distinctions. Le modèle est complet, mais son résultat est non exclusif et ne lève pas la suspension de l'hypothèse-horizon.

## Question discriminante

Une famille finie de compatibilités, fixée sans utiliser les résultats, produit-elle conjointement une orientation, un invariant de factorisation et une exclusion quantitative qui ne soient ni codés dans les entrées ni reproduits par des contrôles appariés ?

## Séparation des énoncés

- **Observation initiale :** aucun fichier de données, graphe fini complet ou résultat d'énumération n'était présent avant le test de déblocage du 2026-08-15.
- **Observation actuelle :** une paire complète est figée dans `finite_compatible_model_input.py` et exécutée par `execute_finite_compatible_models.py`.
- **Attribution :** la source recommande 8–20 distinctions, trois observables indépendantes et des tests de représentation.
- **Hypothèse testée :** des motifs émergents non triviaux peuvent résulter des seules compatibilités.
- **Inférence autorisée :** seulement après contrôles prévus.
- **Démonstration attendue :** certificats exhaustifs reproductibles ; un calcul jouet restera un résultat du modèle, jamais une nouvelle physique.

## Spécification à figer avant exécution

1. Un ensemble étiqueté `D` de 8 à 12 distinctions.
2. Un complexe simplicial ou hypergraphe `C ⊆ P(D)`, donné intégralement.
3. Les opérations locales admissibles, l'équivalence par isomorphisme et la règle d'extension d'une description partielle.
4. Trois observables définies indépendamment : frustration d'orientation `F_T`, dimension d'invariant `D_I`, et défaut de composition/substituabilité `Δ`.
5. Une statistique primaire et son seuil d'exclusivité, fixés avant calcul.

## Énumération et certificats

Énumérer toutes les configurations admissibles, quotienter seulement après conservation des multiplicités, calculer les observables en arithmétique exacte et publier : entrée canonique, cardinalités avant/après quotient, histogrammes, témoins minimaux et hachage du programme. Tout optimum doit avoir un témoin ou une borne exhaustive.

## Contrôles

- Permutations des étiquettes et représentations canoniques isomorphes.
- Hypergraphes appariés en taille, degrés et nombres d'hyperarêtes.
- Ablation de chaque type d'hyperarête et permutation des observables.
- Contrôle abélien et modèle `S3` jouet analysés séparément, sans les utiliser pour sélectionner `C`.
- Recherche d'un encodage équivalent dans contextualité/faisceaux et modèles causaux finis.

## Résultat exclusif requis

Un résultat est « exclusif » seulement si une relation quantitative ou une configuration interdite : (a) n'est pas une conséquence directe d'une définition, (b) survit aux recodages, (c) échoue dans au moins un concurrent apparié, et (d) était préenregistrée. Une corrélation seule, une positivité par construction ou un ajustement après coup ne suffit pas.

## Critères de décision

- **Lever la suspension :** modèle complet publié **et** résultat exclusif reproduit.
- **Maintenir la suspension :** modèle incomplet, résultat non exclusif ou contrôle manquant.
- **Affaiblir :** résultat absorbé par tous les concurrents appariés.
- **Rejeter :** seulement après un résultat discriminant contraire à une prédiction nécessaire, jamais sur absence de trace sans détectabilité.

## Usage de Corpus 11 Tools

Employer le paquet comme jeu d'audit : provenance des entrées, séparation capacité/exécution/robustesse, graphe de dépendances et non-régression. Ne pas en dériver les mécanismes candidats et ne pas le présenter comme donnée physique.

## Premier résultat

Le cycle de huit donne `F_T=4/24`, `D_I=0`, `Δ=0/8`; l'union de deux cycles de quatre donne `F_T=8/24`, `D_I=0`, `Δ=0/8`. La différence suit directement les entrées et échoue donc au critère d'exclusivité. Le blocage « modèle fini absent » est levé ; le blocage « résultat exclusif absent » demeure.
