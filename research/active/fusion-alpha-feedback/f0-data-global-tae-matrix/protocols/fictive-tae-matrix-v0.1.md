# F0-TAE-FICT-001 — matrice TAE fictive contrôlée

Statut déclaré dans la configuration : **protocole fixé avant exécution**. Cette
chaîne est auto-déclarée et ne constitue pas un verrou temporel indépendant.
Portée : `model_internal` pour le solveur linéaire fictif et
`pipeline_verified` pour matching, provenance et reconstruction.

## Question

Dans une famille alpha entièrement déclarée, une représentation orbitale
conservative dépendant de l'énergie et du pitch modifie-t-elle le contraste de
drive entre ralentissement SD et Maxwellienne appariée, ou l'écart reste-t-il
un simple effet de forme indépendant de FOW ?

## Générateur et quadrature

Le générateur produit des masses de cellules sur `r × pitch × E`. Il déclare
grilles, poids, unités, jacobien, loi radiale de densité, énergie critique
radiale et coupure de naissance. Trois raffinements indépendants utilisent la
même famille continue. Aucune entrée publique ou réelle n'est utilisée.

La Maxwellienne est appariée dans chaque cellule source `(r,pitch)` en densité
et énergie moyenne. Un opérateur radial conservatif, dépendant de l'énergie et
du pitch, est appliqué à SD et M sans nouvel appariement.

## Solveur fictif et rivaux

Le solveur est une fonctionnelle linéaire globale, pas un code de stabilité
réel. Trois noyaux radiaux–pitch–énergie sont fixés avant exécution. La sortie
primaire est l'interaction :

`I = (D_SD,FOW - D_SD,ZOW) - (D_M,FOW - D_M,ZOW)`.

Rivaux :

- `moment_only` : les quatre drives coïncident pour une fonction affine de
  l'énergie et uniforme en espace ;
- `shape_only` : SD/M diffèrent, mais `I=0` ;
- `shape_orbit_interaction` : au moins deux noyaux conservent `I≠0` sous
  raffinement.

## Contrôles et verdicts

Contrôles obligatoires : opérateur identité, noyau uniforme, noyau de moments,
conservation par fond, matching cellule par cellule, linéarité, trois niveaux
de grille et reconstruction octet-identique.

Le niveau coarse est diagnostique. La règle `stable_nonzero` fixée compare
uniquement fine à référence : même signe, interaction de référence au-dessus du
zéro numérique et variation relative fine→référence au plus égale à `0.2`.

Verdicts possibles : `shape_orbit_interaction_model_internal`,
`shape_only_no_orbit_interaction`, `inconclusive_refinement` ou
`pipeline_invalid`.

## Limites et retrait

Le drive n'est ni un taux de croissance TAE, ni une stabilité, ni un transport
alpha. Le retirer si la provenance est incomplète, si un contrôle échoue, si
moins de deux noyaux passent le critère fine→référence, si l'interaction y
disparaît ou si la reconstruction change.
