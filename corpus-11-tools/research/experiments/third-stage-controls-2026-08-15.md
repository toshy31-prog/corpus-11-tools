# Résultats : champ d'effacement et incidence des actions

## Statut

Deux recherches finies exhaustives ont été exécutées le 2026-08-15. Corpus 11 est utilisé pour compiler les observables, distinguer trace et mémoire effective, auditer la dépendance au champ et conserver le reste entre contrôles appariés. Il ne fournit pas les résultats mathématiques et n'est pas une source de physique.

## Effacement à excentricité fixée

Les `6^4` séquences de Prüfer des arbres étiquetés à six sommets ont été parcourues. La première paire discriminante est appariée sur :

- `C_info=1`, états terminaux et distance de Hamming six ;
- cinq arêtes, travail cinq et profondeur minimale trois ;
- séquence de degrés `(3,2,2,1,1,1)` ;
- degré du port deux et excentricité du port trois.

Après perte uniforme d'une arête avant propagation, les nombres de traces encore réactivables sont respectivement `(4,2,1,1,1)` et `(4,3,1,1,1)`, soit des moyennes `9/5` et `10/5`.

Hamming et excentricité ne déterminent donc pas la charge résiduelle. Le nouveau résidu est toutefois exactement le profil des tailles de coupes enracinées à une arête : il s'agit encore d'un invariant topologique standard, désormais intégré au profil vectoriel de désinscription.

Le terme « trace réactivable » est fonctionnel : un bit non atteint reste un porteur accessible sous le protocole. Il ne désigne ni mémoire vécue ni continuité subjective.

## Actions à profil fixe marginal identique

Les 91 sous-groupes distincts engendrés par au plus deux matrices de permutations signées en dimension trois ont été énumérés exactement. Une paire d'actions fidèles de `V4` et `C4` est appariée sur :

- ordre quatre et dimension trois ;
- une identité de dimension fixe trois ;
- trois éléments non triviaux de dimension fixe un ;
- même poids `q` de l'identité et même dénominateur `(q+3)²`.

Les résultats diffèrent :

- `V4` : numérateur de `P_I = q²+6q+3` ;
- `C4` : numérateur de `P_I = q²+6q+9`, donc `P_I=1`.

Le profil fixe marginal ne détermine pas `P_I`. Dans l'action `C4`, les trois éléments non triviaux partagent un même axe fixe ; dans l'action `V4`, leurs lignes fixes distinctes n'ont pas d'intersection commune deux à deux. Le discriminant est l'incidence des sous-espaces fixes, et non la non-commutativité puisque les deux groupes sont abéliens.

## Condition d'arrêt pour `P_I`

À pondération fixée, `P_I` est par définition le comptage pondéré des paires dont l'intersection fixe est non nulle. Une fois la matrice d'incidence paire-à-paire appariée, `P_I` est forcé. Aucun contrôle supplémentaire sur ce même observable ne peut attribuer un reste au groupe au-delà de l'action et de cette incidence.

Le jouet `S3` est donc requalifié comme illustration exacte mais affaiblie. Un nouveau test de structure de groupe exigerait un autre observable préenregistré — par exemple conditionné par la composition ou par des intersections triples — et ne doit pas être inventé après coup pour sauver l'hypothèse.

## Fichiers reproductibles

- `research/experiments/compare_equal_eccentricity_erasure_robustness.py`
- `research/experiments/compare_fixed_profile_group_actions.py`
