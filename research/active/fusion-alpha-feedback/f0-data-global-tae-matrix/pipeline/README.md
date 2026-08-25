# Pipeline préparatoire `F0`

Exécuter les invariants internes :

```bash
python3 -m unittest -v test_f0_matching.py
```

Le jeu de test est synthétique et sert uniquement à vérifier le matching de
moments, la conservation du map d'orbite et les refus explicites. Il ne
constitue pas une distribution alpha ou un calcul TAE.

Exécuter les deux versions séparées de la matrice fictive :

```bash
python3 run_fictive_tae_matrix.py \
  --config fictive_tae_matrix_v0.1.json \
  --output ../reports/fictive-tae-matrix-v0.1
python3 run_fictive_tae_matrix.py \
  --config fictive_tae_matrix_v0.2.json \
  --output ../reports/fictive-tae-matrix-v0.2
python3 -m unittest -v test_fictive_tae_matrix.py
```

La v1 négative est conservée. La v2 est un protocole distinct qui corrige
uniquement l'échelle du déplacement orbital ; elle ne réécrit pas la v1.
Une comparaison canonique verrouille tous les paramètres non propres à
l'opérateur, notamment la décision et le seuil. `fixed_before_execution` est une
déclaration des configurations, sans verrou temporel indépendant. Le verdict de
stabilité numérique utilise fine→référence seulement; coarse est diagnostique.

La convention de construction est définie dans
[`../matching-contract.md`](../matching-contract.md).
