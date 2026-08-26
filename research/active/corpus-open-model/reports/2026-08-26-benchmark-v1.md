# Benchmark v1 — première observation

## Résultats observés

| Méthode | Recall@3 | Precision@3 | Abstention sur négatifs |
| --- | ---: | ---: | ---: |
| Recouvrement lexical | 0,27 | 0,08 | 0,00 |
| CorpusNet-Router v0 | 0,36 | 0,19 | 0,33 |
| CorpusNet-Router v0 avec abstention | 0,27 | 0,25 | 0,67 |

Le réseau v0 dépasse ici la baseline sur les cas synthétiques v1, mais manque
encore une partie des négatifs et ce jeu a été rédigé dans le même projet. Ce
signal est donc `internal_signal_only`, pas une sélection, une publication ou
une validation externe.

## Conséquence

V1 devient observé et ne doit pas servir à régler v0. La prochaine variante,
GraphCorpusNet v1, est entraînée sur les mêmes partitions historiques mais ne
sera comparée qu'après sélection sur validation et contre un nouveau benchmark
gelé v2.
