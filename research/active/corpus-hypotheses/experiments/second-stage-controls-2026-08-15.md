# Résultats : contrôles de second niveau

## Statut

Tests finis exécutés le 2026-08-15 après les premiers contrôles appariés. Ils discriminent des mécanismes internes aux modèles ; ils ne constituent ni mesure empirique ni résultat physique.

## Désinscription à distance de Hamming fixée

Deux arbres enracinés sur six sommets ont été appariés sur :

- les états terminaux `000000` et `111111`, donc une distance de Hamming égale à six ;
- `C_info=1` ;
- cinq arêtes et un travail minimal de cinq propagations ;
- la séquence de degrés `(3,2,2,1,1,1)` ;
- un port d'intervention de degré deux ;
- la même opération locale : un sommet déjà remis à zéro peut écraser en parallèle ses voisins.

Une recherche exhaustive sur tous les ensembles de sommets remis à zéro donne une profondeur minimale de deux pour l'arbre peu profond et de trois pour l'arbre profond. La distance de Hamming terminale ne détermine donc pas la profondeur de désinscription.

La différence résiduelle est exactement l'excentricité du port dans le graphe enraciné. Le test établit une dépendance topologique au champ d'intervention, pas encore une quantité nouvelle face aux invariants standards de graphe.

## Classification des actions `S3/C6`

Le profil de dimensions fixes de l'action plane standard de `S3` est : une identité de dimension fixe deux, trois réflexions de dimension fixe un et deux rotations de dimension fixe zéro.

Toutes les classes de représentations orthogonales réelles de dimension deux de `C6` ont été couvertes : caractères de rotation de fréquences `0..3`, puis sommes des caractères réels trivial et signe. Aucune ne reproduit le profil `(2:1,1:3,0:2)` ni le numérateur `q²+6q+3` de `P_I`.

Une ablation à groupe `S3` fixé montre cependant que les autres représentations de dimension deux donnent soit `P_I=1`, soit `P_I=P_T`. La formule exacte du jouet appartient donc au couple `(S3, représentation standard)` et ne peut pas être attribuée à la non-commutativité de `S3` seule.

## Décision

- Renforcer la séparation récupération/désinscription au niveau structurel-topologique sous protocole, tout en notant sa réduction actuelle à l'excentricité enracinée.
- Conserver le jouet `S3` comme résultat exact spécifique à une action ; retirer toute attribution au groupe seul.
- Ne pas extrapoler ces deux résultats au temps physique, aux objets physiques ou à une nouvelle théorie.

## Fichiers reproductibles

- `research/experiments/compare_equal_hamming_erasure_topologies.py`
- `research/experiments/classify_s3_c6_representations.py`
