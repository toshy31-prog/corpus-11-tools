# F0-TAE-FICT-001 — matrice fictive SD/M × ZOW/FOW

Statut temporel : `fixed_before_execution` selon la déclaration du fichier de configuration; aucun verrou temporel indépendant n'est établi.

## Conclusion

Verdict : `inconclusive_refinement`. Noyaux non nuls et stables : aucun.

Le résultat porte sur une fonctionnelle linéaire fictive. Il ne constitue ni un taux de croissance TAE, ni une stabilité, ni un transport alpha.

## Matrice de référence

| Noyau | Drive SD ZOW | Drive M ZOW | Drive SD FOW | Drive M FOW | Interaction normalisée |
|---|---:|---:|---:|---:|---:|
| core_low | 0.176094613 | 0.185685609 | 0.176656808 | 0.186330891 | -0.000445912643 |
| mid_signed | 0.154438755 | 0.175774687 | 0.155813594 | 0.177450048 | -0.001693558 |
| broad_gradient | 0.229976906 | 0.240226074 | 0.232346853 | 0.242739209 | -0.0005898873 |

## Raffinement

Le statut `stable_nonzero` utilise uniquement la variation fine→référence. Le niveau coarse est un diagnostic affiché, non une troisième transition requise par la règle fixée.

- `core_low` : coarse `-0.000502382109`, fine `-0.000565267139`, référence `-0.000445912643`, variation fine→référence `0.267663`, stable `False`.
- `mid_signed` : coarse `-0.00508223049`, fine `-0.00273822673`, référence `-0.001693558`, variation fine→référence `0.616849`, stable `False`.
- `broad_gradient` : coarse `-0.0016828998`, fine `-0.000929846075`, référence `-0.0005898873`, variation fine→référence `0.576311`, stable `False`.

## Contrôles

- écart matching densité : `1.73e-18` ;
- écart matching énergie moyenne : `8.88e-16` ;
- écart conservation orbitale : `0` ;
- identité exacte : `True` ;
- dispersion noyau uniforme : `0` ;
- dispersion noyau de moments : `0` ;
- erreur de linéarité : `0` ;
- échecs : `[]`.

## Portée et retrait

Drive fictif : `model_internal`. Matching, métadonnées et reconstruction : `pipeline_verified`.

Revendications non soutenues : `tae_stability`, `alpha_transport`, `reactor_relevance`.

Effet possible du protocole : The fictional source family, radial critical-energy gradient, orbit map and mode kernels create the drive and interaction; none is calibrated to a plasma device.

Condition de retrait : Withdraw the result if provenance metadata are incomplete, a conservation or negative control fails, fewer than two kernels converge, the interaction disappears under refinement, or deterministic reconstruction changes. A contraction of the represented orbit displacement under grid refinement classifies this version as a method failure.
