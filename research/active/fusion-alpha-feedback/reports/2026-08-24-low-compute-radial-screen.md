# Rapport — second écran CPU : énergie et gradient radial

## Question qui peut changer la décision

Le premier écran comparait seulement `∂E F0`. Or, pour les particules rapides
résonantes, la dérivée pertinente le long de l'invariant onde–particule mêle
énergie et moment toroidal canonique ; dans une réduction locale, ce dernier
apparaît comme un gradient radial. Un écart de pente énergétique seul aurait
donc pu être sans importance si les gradients radiaux rétablissaient une
équivalence.

## Test réellement exécuté

`experiments/low_compute_radial_screen.py` compare, au même point de phase :

- `SD` : le ralentissement isotrope publié ;
- `M` : une Maxwellienne de même densité et même second moment, réappariée à
  chaque rayon.

La famille de profils est explicitement un test de sensibilité :
`nα(ρ) ∝ exp(-ρ)` et `vc(ρ) ∝ exp(-kρ)`. Le rapport `k` balaye `0–2`; il ne
représente pas l'ajustement d'une machine. Les deux sorties pertinentes sont
`|∂ρF_SD|/|∂ρF_M|` et l'écart entre les coefficients normalisés qui annuleraient
`E∂E F + λ∂ρF`.

Les six tests d'invariants passent ; l'exécution de `4913` points est terminée
sur CPU.

## Résultat

```text
c = 0.31–0.53 ; s = 0.50–0.65 ; k = 0–2
|∂ρF_SD|/|∂ρF_M| = 0.582349–2.00542
médiane = 1.16636
désaccords de signe de ∂ρF = 0 / 4913
écart maximal de λ critique normalisé = 0.994571
```

## Conclusion et limite nette

Dans la seule famille testée, le gradient radial ne rend pas les deux fonds
interchangeables. Cela **affaiblit l'hypothèse d'équivalence Maxwellienne**
pour ce verrou du modèle de 2026 ; ce n'est pas une prédiction de croissance
TAE ni une preuve d'amélioration de la fusion. Une valeur de `λ` physique exige
au minimum la géométrie, le `q`, le mode et sa fréquence.

Le pitch n'est pas ajouté comme une Gaussienne ou un polynôme arbitraire : les
alphas de fusion naissent approximativement isotropes. La suite rigoureuse est
donc une borne ZOW/FOW dépendant des invariants d'orbite, pas une distribution
angulaire inventée.

## Sources

- Y. Todo, *Introduction to the interaction between energetic particles and
  Alfvén eigenmodes in toroidal plasmas* (2018), équations 11–13 :
  https://doi.org/10.1007/s41614-018-0022-9
- F. Vannini et al., *Nuclear Fusion* 62, 126042 (2022), distribution isotrope
  de ralentissement : https://doi.org/10.1088/1741-4326/ac8b1e
