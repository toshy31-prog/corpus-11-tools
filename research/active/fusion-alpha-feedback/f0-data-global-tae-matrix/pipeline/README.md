# Pipeline préparatoire `F0`

Exécuter les invariants internes :

```bash
python3 -m unittest -v test_f0_matching.py
```

Le jeu de test est synthétique et sert uniquement à vérifier le matching de
moments, la conservation du map d'orbite et les refus explicites. Il ne
constitue pas une distribution alpha ou un calcul TAE.

La convention de construction est définie dans
[`../matching-contract.md`](../matching-contract.md).
