# Invariants de factorisation

## Formulation

**Hypothèse.** Un objet peut être représenté par un motif invariant sous plusieurs factorisations admissibles d'une même région : `I = ⋂_F Fix(U_F)` et `D_I = dim(I)`. Temporalisation (`F_T`) et stabilité objectale (`D_I`) sont a priori distinctes.

## Statut

active — **phénomène mathématique renforcé, lecture objectale toujours spéculative**. Le reste d'intersection d'ordre trois survit maintenant dans deux familles finies distinctes, dont la représentation naturelle non signée de `S4` sur `Q^4`. Aucun lien au monde physique n'est établi.

## Observations favorables

- **Attribution à la source :** la trace définit quatre phases logiques selon `F_T = 0/>0` et `D_I = 0/>0`.
- **Démonstration :** pour des matrices explicites, l'intersection des noyaux de `U_F - Id` calcule exactement `I`.
- **Premier test exhaustif :** deux triplets de matrices de permutations signées en dimension 3 ont les mêmes dimensions fixes marginales `(2,2,2)` et deux à deux `(1,1,1)`, mais des intersections triples de dimensions `0` et `1`.
- **Portabilité architecturale :** ce contrôle est réobservé comme troisième module, sans modifier `core/`, avec 17/17 attentes conformes sur les `17 296` triplets du catalogue signé.
- **Audit de représentation :** réordonner les factorisations et conjuguer tous les transports par un changement de base inversible préservent exactement les profils et le reste triple.
- **Réplication prospective dans une seconde famille naturelle :** les 24 matrices de permutation ordinaires de `S4` sur `Q^4` donnent 2024 triplets et 26 clés basses. La clé marginale `(3,3,3)` / deux-à-deux `(2,2,2)` réalise des dimensions triples `1` et `2` : 16 triplets à dimension 1 et 4 à dimension 2. Classification préenregistrée : `transported_remainder`.
- **Inférence bornée :** les données d'intersection jusqu'à l'ordre deux ne déterminent pas en général l'intersection d'ordre trois dans au moins deux familles finies naturelles distinctes.

## Observations défavorables

- Le choix des transports `U_F` peut fabriquer l'invariant.
- Le premier jouet aurait maintenu `D_I = 1` indépendamment de l'orientation ; ces valeurs restent à reproduire.
- Stabilité sous factorisation peut être une symétrie ordinaire renommée.
- Les deux familles testées restent des représentations matricielles finies choisies pour leur calculabilité ; aucune nécessité physique de ces transports n'est établie.
- Le résultat `S4` renforce la généralité mathématique du reste, pas l'identification de l'intersection à un objet.
- La migration démontre que le moteur peut porter ce calcul sans traces ni séquence temporelle ; elle ne fournit aucun canal empirique.

## Hypothèses concurrentes

- Les objets sont des excitations ou secteurs de super-sélection standard.
- Le reste d'intersection est un phénomène ordinaire de géométrie des sous-espaces fixes, sans statut objectal privilégié.
- L'invariant provient d'un couplage ad hoc aux contraintes temporelles.
- La robustesse pertinente est dynamique, non une intersection statique de points fixes.

## Prédictions discriminantes

- Des factorisations nouvellement ajoutées, fixées avant calcul, doivent réduire `I` de façon calculable sans redéfinir les transports après observation.
- Un reste objectal robuste devrait survivre à l'ajout prospectif de factorisations selon une règle non triviale et dépasser des contrôles appariés de géométrie de sous-espaces.
- Des exemples finis doivent réaliser séparément les quatre phases proposées.
- Une co-émergence non artificielle exige un mécanisme commun fixé en amont et une relation entre `F_T` et `D_I` absente de contrôles appariés.

## Condition de renversement

La simple existence d'un reste d'ordre trois n'est plus fragile face au changement de la première famille : elle survit dans `S4`. En revanche, requalifier comme géométrie statique ordinaire si la stabilité sous ajout de nouvelles factorisations est entièrement prédite par les dimensions/intersections standards des sous-espaces et si aucun résidu prospectif ne subsiste face à des contrôles appariés. Aucun rejet de la classe entière sans ce test.

## Méthodes nécessaires

Fixer factorisations et foncteurs de transport avant calcul ; algèbre linéaire exacte ; tests de changement de base ; contrôles randomisés et ablations ; comparer la survie de `I` sous ajout de nouvelles factorisations à des familles de sous-espaces appariées ; comparaison aux invariants de jauge et secteurs connus. Le module utilise les mineurs entiers exacts et traite ordre de présentation et journal d'exécution comme provenance seulement.

## Sources

- `research/sources/Trace_complete_hypothese_temps_recherche.pdf`, sections 10–13 et 18–19.
- `research/experiments/enumerate_higher_order_fixed_intersections.py`.
- `research/experiments/factorization-s4-permutation-preregistration-2026-08-18.md`.
- `research/experiments/factorization-s4-permutation-results-2026-08-18.md`.
- Corpus 11 Tools : audit des dépendances et des attributions.

## Dernière mise à jour

2026-08-18 — reste d'ordre trois transporté prospectivement vers les matrices de permutation ordinaires de `S4` sur `Q^4`
