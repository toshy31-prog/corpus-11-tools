# Co-émergence par holonomie S3

## Formulation

**Hypothèse-jouet.** Dans un modèle fini utilisant `S3`, une même holonomie de boucle peut porter une parité d'orientation et un espace de points fixes ; une pression vers l'identité peut donc favoriser simultanément temporalisation et invariant objectal sans les identifier.

## Statut

weakened — **illustration exacte exclusivement**. `P_I` est attribuable à l'incidence des sous-espaces fixes de l'action pondérée ; aucun mécanisme spécifique à `S3` ou à la non-commutativité n'est établi.

## Observations favorables

- **Démonstration dans le jouet :** dans la représentation plane du triangle, l'identité fixe deux dimensions, une rotation non triviale zéro et une réflexion une.
- **Démonstration dans le jouet :** avec un poids `q=e^K` pour l'identité et deux boucles indépendantes, le comptage donne `P_T=((q+2)/(q+5))²` et `P_I=(q²+6q+3)/(q+5)²` sous les conventions de la source.
- **Classification finie :** aucune représentation orthogonale réelle de dimension deux de `C6` ne reproduit le profil fixe `(2:1,1:3,0:2)` ni le numérateur `q²+6q+3` de l'action standard de `S3`.
- **Contrôle d'incidence :** deux actions fidèles abéliennes de `V4` et `C4`, appariées sur ordre, dimension et profil fixe marginal, donnent des numérateurs `q²+6q+3` et `q²+6q+9` ; l'incidence paire-à-paire, pas la non-commutativité, explique la différence.
- **Inférence limitée :** la non-commutativité mémorise l'ordre et peut séparer parité globale et invariant interne.

## Observations défavorables

- Indépendance des boucles, poids de Gibbs et représentation sont choisis.
- Favoriser `H=e` favorise presque par définition plusieurs propriétés de l'identité.
- Un contrôle `C6` apparié reproduit exactement `P_T` et fait lui aussi croître `P_I` avec le poids de l'identité : la co-augmentation qualitative n'est pas spécifique à la non-commutativité.
- La différence restante de `P_I` peut venir des points fixes des réflexions de la représentation de `S3`, absents dans la représentation plane fidèle par rotations de `C6`.
- À groupe `S3` fixé, les autres représentations réelles de dimension deux donnent `P_I=1` ou `P_I=P_T` : la non-commutativité seule ne détermine pas l'observable.
- Une fois l'incidence paire-à-paire et les poids appariés, `P_I` est forcé par sa définition ; ce même observable ne peut plus révéler un reste de structure de groupe.
- Aucun passage à une limite, observable empirique ou résultat exclusif face à une jauge discrète connue n'existe.

## Hypothèses concurrentes

- Coïncidence combinatoire spécifique à `S3`.
- Reformulation d'une théorie de jauge discrète standard.
- Corrélation produite par le poids choisi, sans mécanisme d'émergence.

## Prédictions discriminantes

- Les formules exactes doivent être retrouvées par énumération indépendante des `6²` paires.
- Des groupes/représentations de contrôle doivent montrer quelles relations sont spécifiques à la non-commutativité plutôt qu'à la classe de poids.
- Un résultat propre exigerait une relation ou exclusion impossible dans les modèles abéliens et cadres discrets concurrents appariés.

## Condition de renversement

Requalifier comme simple illustration si l'énumération contredit les formules ou si tout effet se reproduit dans un contrôle abélien apparié. Requalifier comme reformulation, non rejeter, si aucune prédiction ne dépasse la jauge discrète connue.

## Méthodes nécessaires

Énumération exacte, conventions de multiplication explicites, tests sur groupes abéliens et non abéliens, variations de représentation et de poids, analyse de sensibilité. Interdire toute extrapolation physique depuis ce calcul jouet.

## Sources

- `research/sources/Trace_complete_hypothese_temps_recherche.pdf`, sections 12–14 et 19.
- Corpus 11 Tools : audit de reproductibilité et de portée.

## Dernière mise à jour

2026-08-15 — requalifié après contrôle d'incidence `V4/C4`
