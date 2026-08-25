# Invariants de factorisation

## Formulation

**Hypothèse.** Un objet peut être représenté par un motif invariant sous plusieurs factorisations admissibles d'une même région : `I = ⋂_F Fix(U_F)` et `D_I = dim(I)`. Temporalisation (`F_T`) et stabilité objectale (`D_I`) sont a priori distinctes.

## Statut

weakened — **phénomène mathématique robuste d'ordre trois, lecture objectale prospective non soutenue dans les familles locales testées**. Le reste d'intersection triple survit dans deux familles finies distinctes, mais les tests prospectifs `S4` et `B3` sont `not_supported`. La piste locale est close sans prédiction ou observable réellement distinct fixé avant calcul.

## Observations favorables

- **Attribution à la source :** la trace définit quatre phases logiques selon `F_T = 0/>0` et `D_I = 0/>0`.
- **Démonstration :** pour des matrices explicites, l'intersection des noyaux de `U_F - Id` calcule exactement `I`.
- **Premier test exhaustif :** deux triplets de matrices de permutations signées en dimension 3 ont les mêmes dimensions fixes marginales `(2,2,2)` et deux à deux `(1,1,1)`, mais des intersections triples de dimensions `0` et `1`.
- **Portabilité architecturale :** ce contrôle est réobservé comme troisième module, sans modifier `core/`, avec 17/17 attentes conformes sur les `17 296` triplets du catalogue signé.
- **Audit de représentation :** réordonner les factorisations et conjuguer tous les transports par un changement de base inversible préservent exactement les profils et le reste triple.
- **Réplication prospective dans une seconde famille naturelle :** les 24 matrices de permutation ordinaires de `S4` sur `Q^4` donnent 2024 triplets. La clé marginale `(3,3,3)` / deux-à-deux `(2,2,2)` réalise des dimensions triples `1` et `2` : 16 triplets à dimension 1 et 4 à dimension 2. Classification fixée avant exécution : `transported_remainder`.
- **Audit quotienté exact :** retirer la droite constante commune de la représentation `S4` conserve le contraste d'ordre trois sous la clé quotientée `(2,2,2)/(1,1,1)` (`Dq3=0` pour 16 triplets, `Dq3=1` pour 4). Il confirme ainsi que le reste d'ordre trois est une différence géométrique calculable, même après retrait du plancher commun.
- **Extension du catalogue signé `B3`, distinct de `S4` :** dans les 48 permutations signées de dimension 3, 84 triplets partagent la clé basse `((2,2,2),(1,1,1))`; 68 ont une intersection triple nulle et 16 une intersection de dimension un. Le phénomène d’ordre trois existe donc aussi sans plancher fixe commun forcé.
- **Inférence bornée :** les données d'intersection jusqu'à l'ordre deux ne déterminent pas en général l'intersection d'ordre trois dans au moins deux familles finies distinctes.

## Observations défavorables

- Le choix des transports `U_F` peut fabriquer l'invariant.
- Stabilité sous factorisation peut être une symétrie ordinaire renommée.
- Les deux familles testées restent des représentations matricielles finies choisies pour leur calculabilité ; aucune nécessité physique de ces transports n'est établie.
- **H4 non satisfaite :** dans la famille `S4`, après ajout prospectif de chacune des 21 matrices restantes à chaque triplet de la clé `(3,3,3)/(2,2,2)`, seules 1 des 4 strates géométriques appariées a `Delta_D4>0`, trois ont `Delta_D4=0`, médiane exacte `0`. Classification : `not_supported`.
- Toutes les matrices de permutation de `S4` fixent la droite constante `span((1,1,1,1))`. Les triplets à `D3=1` sont déjà sur ce plancher commun et restent à `D4=1` sous tout ajout ; les triplets à `D3=2` perdent leur dimension supplémentaire pour tout ajout non trivial dans les strates appariées et retombent à `D4=1`.
- La survie positive `D4>0` est donc triviale dans cette représentation et ne constitue pas un signal de stabilité objectale.
- **Le quotient ne lève pas l'échec prospectif :** après retrait exact de la droite constante, les `400` ajouts non identitaires réalisent trois strates appariées et donnent toutes `Dq4=0`, pour les groupes `Dq3=0` comme `Dq3=1`. Les trois contrastes et leur médiane sont exactement nuls ; la classification locale reste `not_supported`.
- **H5 non satisfaite dans `B3` :** les `3 780` extensions à une quatrième matrice forment cinq strates appariées; seulement deux contrastes sont positifs et leur médiane exacte est `0`. La classification enregistrée est `not_supported`, sans explication par un sous-espace fixe commun forcé.
- Le résultat `transported_remainder` renforce la généralité mathématique du reste triple, mais H4 montre que ce reste ne transporte pas ici la stabilité prospective recherchée.
- Aucun canal empirique, aucune dynamique matérielle et aucun passage d'échelle ne sont fournis.

## Hypothèses concurrentes

- Le reste d'intersection est un phénomène ordinaire de géométrie des sous-espaces fixes, sans statut objectal privilégié.
- Le contraste `D3=1/2` de `S4` reflète la présence d'un sous-espace fixe commun forcé et une dimension supplémentaire fragile, pas une stabilité intrinsèque.
- Les objets sont des excitations ou secteurs de super-sélection standard.
- L'invariant provient d'un choix ad hoc de factorisations/transports.
- La robustesse pertinente est dynamique ou quotientée par les invariants communs de la famille, non la dimension brute de l'intersection.

## Prédictions discriminantes

- Ne pas prolonger la même représentation `S4` à cinq factorisations avec la survie positive brute : la droite constante rendrait ce critère trivial.
- La famille indépendante sans plancher commun a maintenant été exercée dans `B3` et produit elle aussi `not_supported`. Ne pas chercher un nouveau catalogue favorable du même type; une réouverture exige une prédiction ou un observable distinct, fixé avant calcul, capable de changer la lecture objectale.
- Des factorisations nouvellement ajoutées doivent réduire `I` de façon calculable sans redéfinir les transports après observation.
- Des exemples finis doivent réaliser séparément les quatre phases proposées.
- Une co-émergence non artificielle exige un mécanisme commun fixé en amont et une relation entre `F_T` et `D_I` absente de contrôles appariés.

## Condition de renversement

La simple existence d'un reste d'ordre trois est robuste face au changement de la première famille : elle survit dans `S4`.

Les tests de stabilité prospective sont négatifs (`not_supported`) dans `S4`, dans son quotient et dans la famille indépendante `B3` sans plancher commun forcé. La condition annoncée de requalification est atteinte : dans le programme local, la lecture objectale est ramenée à un phénomène de géométrie statique des espaces fixes. Elle ne redevient active qu’avec une prédiction distincte fixée en amont et non absorbée par les dimensions ou intersections standards.

Ne pas généraliser les résultats finis H4/H5 à toute classe mathématique possible; ils suffisent seulement à affaiblir et clore la lecture objectale du programme local.

## Méthodes nécessaires

Fixer une règle de construction des factorisations et foncteurs de transport avant calcul ; algèbre linéaire exacte ; contrôler explicitement l'intersection fixe commune de toute famille ; utiliser au besoin le quotient par ce sous-espace avant de définir une survie ; tests de changement de base ; contrôles appariés ; comparaison aux invariants de jauge et secteurs connus. Ne pas adapter la famille de transports après lecture d'un résultat.

## Sources

- `research/sources/Trace_complete_hypothese_temps_recherche.pdf`, sections 10–13 et 18–19.
- `research/experiments/enumerate_higher_order_fixed_intersections.py`.
- `research/experiments/factorization-s4-permutation-results-2026-08-18.md`.
- `research/experiments/factorization-fourth-extension-results-2026-08-18.md`.
- `research/experiments/factorization-s4-quotient-audit-results-2026-08-25.md`.
- `research/active/corpus-hypotheses/reports/b3-fixed-space-intersections-note-2026-08-24.md`.
- Corpus 11 Tools : audit des dépendances et des attributions.

## Dernière mise à jour

2026-08-25 — intégration de H5 dans `B3` : 2/5 strates positives, médiane `0`, classification `not_supported`; lecture objectale locale `weakened`
