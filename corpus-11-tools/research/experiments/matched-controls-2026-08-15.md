# Résultats : contrôles appariés récupération/désinscription et `S3/C6`

## Statut

Tests finis exécutés le 2026-08-15. Les contrôles précis n'avaient pas été préenregistrés ; les résultats bornent donc les mécanismes jouets sans établir de prédiction physique exclusive.

## Paire récupération/désinscription

Deux circuits de largeur `N=2..8` reçoivent le même bit. Le circuit localisé produit `(b,0,...,0)` ; le circuit diffusé produit `(b,b,...,b)`. La famille d'entrées, le nombre de fils, les lectures terminales locales, les resets locaux vers zéro et le critère d'égalité exacte sont identiques.

L'énumération exhaustive donne :

- localisé : `C_info=1`, `C_erase=1` ;
- diffusé : `C_info=1`, `C_erase=N`.

La récupération égale ne détermine donc pas la désinscription sous ce protocole. Cependant, `C_erase` est exactement la distance de Hamming entre les deux états terminaux : le test ne démontre pas encore une quantité distincte des mesures standard.

## Contrôle abélien `S3/C6`

Le contrôle `C6` est apparié à `S3` par l'ordre du groupe, le poids `q` de l'identité, une représentation réelle fidèle de dimension deux et un secteur d'orientation de cardinal trois. Chaque modèle énumère exactement `6²=36` paires ordonnées.

Les dénominateurs sont identiques : `(q+5)²`. Les résultats sont :

- les deux groupes : `P_T=(q²+4q+4)/(q²+10q+25)` ;
- `S3` : `P_I=(q²+6q+3)/(q²+10q+25)` ;
- `C6` : `P_I=q²/(q²+10q+25)`.

La pression vers l'identité augmente `P_T` et `P_I` dans le contrôle abélien aussi. La co-augmentation qualitative n'est donc pas attribuable à la seule non-commutativité. La différence exacte de `P_I` subsiste, mais elle peut provenir de la structure des points fixes de la représentation — réflexions pour `S3`, rotations pour `C6` — plutôt que de la non-commutativité comme telle.

## Fichiers reproductibles

- `research/experiments/compare_recovery_erasure_architectures.py`
- `research/experiments/compare_s3_c6_holonomy.py`

## Décision

Conserver la séparation opérationnelle récupération/désinscription comme hypothèse active, tout en exigeant un prochain exemple non réductible à la distance de Hamming. Conserver le jouet `S3` comme illustration exacte, mais affaiblir l'attribution de sa co-augmentation qualitative à la non-commutativité.
