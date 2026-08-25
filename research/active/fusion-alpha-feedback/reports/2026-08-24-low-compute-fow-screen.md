# Rapport — troisième écran CPU : borne ZOW/FOW en invariants d'orbite

## Question qui peut changer la décision

Les alphas de fusion naissent approximativement isotropes. Un profil de pitch
ad hoc serait donc une mauvaise manière de « compléter » le modèle. La forme
FOW publiée déplace plutôt le centre de profil en fonction de `(E, μ, Pφ)` et
du signe co/counter. Ce déplacement peut-il être négligé face à l'écart déjà
observé entre le ralentissement et la Maxwellienne appariée ?

## Antériorité

Le contraste FOW/ZOW pour un ralentissement alpha n'est pas nouveau :
Fitzgerald et al. l'ont déjà employé et ont traité sa différence comme une
incertitude de stabilité. Le présent écran ne le revendique pas comme une
découverte ; il rend explicite une convention de matching **canonique**
`{SD, M au même rhoC} × {représentation ZOW, représentation FOW}` et un test
de sensibilité local. Une Maxwellienne locale ne définit pas automatiquement
sa cellule FOW.

## Test exécuté

À `W`, `μ` et `Pφ` fixés, le code forme le noyau de gradient

\[
K=\omega D_E-n_{tor}D_P,
\quad D_E=\left.\partial_WF\right|_{\mu,P_\phi},
\quad D_P=\left.\partial_{P_\phi}F\right|_{W,\mu}.
\]

Il rapporte le zéro adimensionné **local** `eta*` de ce noyau. Ce n'est pas un
seuil de stabilité : le vrai drive se calcule par intégrale résonante pondérée
sur le mode et les amortissements. Pour FOW, le centre de profil est déplacé
de `sigma delta sqrt(x(1-lambda))`. La dérivée en énergie est correctement
prise à `μ` fixe ; `lambda` n'est pas tenu fixe.
Les alphas profondément piégés sont exclus et le balayage reste loin du cutoff
de naissance.

## Résultat

```text
c = 0.31–0.53 ; s = 0.50–0.65
pitch lambda = 0–0.9 ; delta/Lnalpha = 0–1
points : 29 282
écart SD/M du zéro local ZOW : 0.00598222–0.457378
translation FOW maximale du zéro local (SD) : 1.02774
FOW >= écart SD/M : 15 576 / 29 282 points
facteur d'amplitude FOW/ZOW : 0.522046–1.91554
```

## Conclusion

Dans ce domaine **non calibré**, la correction de représentation FOW peut
dépasser l'écart entre les deux fonds. Cela ne dit pas qu'elle le fait dans
SPARC ou ITER. Il en résulte une condition de décision claire : sans borne de
`delta/Lnalpha`, un verdict faible-fidélité sur le noyau alpha est indécidable ;
avec une borne faible, cette branche pourra être éliminée sans HPC.

## Sources

- M. Fitzgerald et al., *Nuclear Fusion* 63, 112006 (2023), équations de
  distribution et comparaison ZOW/FOW :
  https://doi.org/10.1088/1741-4326/acee14
- F. Vannini et al., *Nuclear Fusion* 62, 126042 (2022), ralentissement et
  Maxwellienne équivalente : https://doi.org/10.1088/1741-4326/ac8b1e
- Y. Todo, *Reviews of Modern Plasma Physics* (2018), invariant et gradients
  résonants : https://doi.org/10.1007/s41614-018-0022-9
