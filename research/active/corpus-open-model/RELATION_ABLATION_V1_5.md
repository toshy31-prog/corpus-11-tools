# Ablation relationnelle v1.5

## Question testable

À données, architecture, initialisation et partition identiques, le signal de
compteur de relations déclarées change-t-il la perte MLM sur les documents qui
portent au moins une relation déclarée ?

## Deux branches préenregistrées

| Branche | Token relationnel | Embedding relationnel |
| --- | --- | --- |
| `declared` | compteur déclaré | compteur déclaré (0–8) |
| `ablated` | `<relation-context:ablated>` | toujours 0 |

L’ablation neutralise les deux canaux afin que le token de tête ne conserve pas
à lui seul l’information relationnelle.

## Partition

Les tests déjà observés v1.3 (78 documents) et v1.4 (90 documents) sont exclus
de toutes les partitions v1.5. Les documents restants sont répartis par
hachage, séparément pour les strates `has_declared_relation` et
`no_declared_relation`. À la compilation actuelle, 53 documents porteurs de
relation restent disponibles, tous sur la surface `product`.

Le stratificateur réserve explicitement cinq documents relationnels en
validation et cinq en test lorsque le corpus le permet ; le reste est
entraînement. Cinq exemples restent un signal exploratoire, non une puissance
statistique élevée. Les comptes exacts sont imprimés avant chaque run.

## Sélection et test

Chaque branche est entraînée 1 000 pas, avec même graine PyTorch (`251`), et
sélectionne son meilleur checkpoint sur la perte validation de la strate
relationnelle. `select_relation_ablation_v1_5.py` fige ensuite la branche
sélectionnée sans consulter le test.

L’ouverture unique du test mesure néanmoins les deux branches préenregistrées,
sur les mêmes documents, et rapporte trois pertes : tous documents, documents
avec relation, documents sans relation. Aucune de ces valeurs ne peut ensuite
servir à régler v1.5.

## Limites

Le compteur ne dit ni le type, ni le sens, ni la validité d’une relation. Les
documents relationnels étant tous des documents produit, l’effet écologique
des relations reste confondu avec cette surface dans le corpus disponible. Une
différence d’ablation pourra établir un effet local du signal fourni, pas une
compréhension relationnelle ni une propriété émergente.

## Commandes

```bash
cd ~/Documents/ChatGPT/Corpus
source .venv-tiny-doctrine/bin/activate

python research/active/corpus-open-model/src/train_relation_ablation_v1_5.py --relation-context declared --steps 1000 --eval-every 200
python research/active/corpus-open-model/src/train_relation_ablation_v1_5.py --relation-context ablated --steps 1000 --eval-every 200
python research/active/corpus-open-model/src/select_relation_ablation_v1_5.py
```

Le test reste fermé après ces trois commandes. Son ouverture sera donnée
seulement après inspection de la sélection figée.
