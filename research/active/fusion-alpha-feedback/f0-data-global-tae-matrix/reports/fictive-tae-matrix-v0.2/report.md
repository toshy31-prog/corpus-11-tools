# F0-TAE-FICT-002 — matrice fictive SD/M × ZOW/FOW

Statut temporel : `fixed_before_execution` selon la déclaration du fichier de configuration; aucun verrou temporel indépendant n'est établi.

## Conclusion

Verdict : `shape_orbit_interaction_model_internal`. Noyaux non nuls et stables : `mid_signed`, `broad_gradient`.

Le résultat porte sur une fonctionnelle linéaire fictive. Il ne constitue ni un taux de croissance TAE, ni une stabilité, ni un transport alpha.

## Matrice de référence

| Noyau | Drive SD ZOW | Drive M ZOW | Drive SD FOW | Drive M FOW | Interaction normalisée |
|---|---:|---:|---:|---:|---:|
| core_low | 0.176094613 | 0.185685609 | 0.175376743 | 0.185090582 | -0.000661563098 |
| mid_signed | 0.154438755 | 0.175774687 | 0.158646411 | 0.181106522 | -0.00620728565 |
| broad_gradient | 0.229976906 | 0.240226074 | 0.239338253 | 0.250262143 | -0.0026960652 |

## Raffinement

Le statut `stable_nonzero` utilise uniquement la variation fine→référence. Le niveau coarse est un diagnostic affiché, non une troisième transition requise par la règle fixée.

- `core_low` : coarse `0.000358057589`, fine `-0.000416652399`, référence `-0.000661563098`, variation fine→référence `0.3702`, stable `False`.
- `mid_signed` : coarse `-0.00910141683`, fine `-0.00739784187`, référence `-0.00620728565`, variation fine→référence `0.1918`, stable `True`.
- `broad_gradient` : coarse `-0.00396713187`, fine `-0.00318411012`, référence `-0.0026960652`, variation fine→référence `0.181021`, stable `True`.

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

Effet possible du protocole : The fictional source family, radial critical-energy gradient, fixed radial displacement and mode kernels create the drive and interaction; none is calibrated to a plasma device.

Condition de retrait : Withdraw the result if provenance metadata are incomplete, a conservation or negative control fails, fewer than two kernels converge, the interaction disappears under refinement, the physical displacement changes with grid spacing, or deterministic reconstruction changes.
