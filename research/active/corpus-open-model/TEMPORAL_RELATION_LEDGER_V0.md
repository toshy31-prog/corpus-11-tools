# Registre temporel des relations v0

Chaque exécution observe l’instantané de fichiers Corpus et le graphe enrichi,
puis écrit localement un événement append-only : matériaux ajoutés, retirés ou
modifiés ; arêtes ajoutées ou retirées. Les octets et les arêtes restent dans
l’état local afin de rendre la différence rejouable.

Le registre ne décide pas qu’un changement est important, ne lance aucun
entraînement et ne modifie pas le produit. Une différence est une trace de
milieu, non une mémoire subjective, une intention ou une émergence.

```bash
python research/active/corpus-open-model/src/temporal_relation_ledger.py
```
