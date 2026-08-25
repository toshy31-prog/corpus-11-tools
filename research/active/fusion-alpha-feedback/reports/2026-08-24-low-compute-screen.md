# Rapport — premier écran CPU de la distribution alpha

## Test exécuté

`experiments/low_compute_resonance_screen.py` a comparé une distribution alpha
isotrope de ralentissement et une Maxwellienne de même densité et même second
moment. Les trois invariants logiciels — normalisation, second moment et ratio
fini/positif — passent.

## Résultat

Sur la fenêtre de sensibilité déclarée :

```text
v_c/v_birth : 0.31 à 0.53
v_res/v_birth : 0.50 à 0.65
grille : 17 × 17 = 289 points
|dF_SD/dE| / |dF_M/dE| : 0.634882 à 0.925826
```

Le facteur de pente diffère donc jusqu'à environ 36,5 % dans ce modèle. Il
n'existe pas de point avec un écart d'un facteur deux dans cette fenêtre.

## Conclusion

Le résultat discrimine **l'interchangeabilité locale des deux fonds** pour cet
observable : elle ne tient pas exactement sous l'appariement en deux moments.
Il ne discrimine pas encore les modèles rivaux de gain TAE, parce que les
gradients radiaux, le pitch, la géométrie, l'amortissement et la saturation ne
sont pas observés par ce calcul.

## Décision

Poursuivre sur CPU par un second écran analytique incluant `∂r F0` et une
distribution en pitch déclarée. Ne pas conclure que la voie alpha–TAE aide ou
empêche la fusion, et ne pas engager un calcul gyrocinétique complet sur la
seule base de ce résultat.
