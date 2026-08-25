# Expériences légères

`low_compute_resonance_screen.py` est une expérience analytique
reproductible. Elle ne simule pas un tokamak. Le calcul compare seulement un
facteur de pente en vitesse entre deux fonds alpha à moments appariés. Cette
comparaison est déjà étudiée dans la littérature : ce script est un contrôle,
pas une revendication de nouveauté.

Exécution :

```bash
python3 low_compute_resonance_screen.py --output ../reports/low-compute-screen
python3 test_low_compute_resonance_screen.py
```

La sortie comprend `grid.csv`, `summary.json` et `report.md`.

Un deuxième appel peut scanner une fenêtre déclarée, sans prétendre qu'elle
équivaut automatiquement à un scénario physique :

```bash
python3 low_compute_resonance_screen.py \
  --output ../reports/low-compute-sensitivity-window \
  --critical-min 0.31 --critical-max 0.53 \
  --resonance-min 0.50 --resonance-max 0.65 \
  --label 'sensitivity window, not a device fit'
```

`low_compute_radial_screen.py` est le second écran. Il ajoute la dérivée
radiale locale à la dérivée en énergie, avec une famille de profils
co-décroissants explicitement déclarée. Il ne choisit pas un tokamak ni une
valeur physique de coefficient de mode : il teste seulement si l'appariement
en deux moments rend ces deux dérivées interchangeables. Le principe est
également antériorisé ; ce code vérifie notre chaîne de raisonnement.

```bash
python3 low_compute_radial_screen.py --output ../reports/low-compute-radial-window
python3 test_low_compute_radial_screen.py
```

`low_compute_fow_screen.py` est une borne de sensibilité ZOW/FOW basée sur la
forme publiée en invariants d'orbite. Il ne postule pas une anisotropie de
pitch ; il explore le décalage d'orbite adimensionné `delta/Lnalpha` et les
branches co/counter. Le matching SD/M au même `rhoC` est une convention
canonique explicitement choisie. La sortie est le zéro d'un noyau local
normalisé, pas un seuil de stabilité ni un taux de croissance TAE. La famille
ZOW/FOW est elle aussi antériorisée.

```bash
python3 low_compute_fow_screen.py --output ../reports/low-compute-fow-window
python3 test_low_compute_fow_screen.py
```
