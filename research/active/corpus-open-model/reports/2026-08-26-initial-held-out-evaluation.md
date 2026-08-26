# Évaluation interne initiale — CorpusNet-Router v0

## Protocole observé

Le 26 août 2026, le runner local a entraîné le réseau sur 58 descriptions de
skills et 57 prompts `train`. Les 9 prompts du partition `test` n'ont pas été
utilisés pour ajuster les poids. Il a comparé le réseau à une baseline de
recouvrement lexical à `k=3`.

## Résultats

| Méthode | Recall@3 | Precision@3 | Abstention |
| --- | ---: | ---: | ---: |
| Recouvrement lexical | 0,30 | 0,11 | 0,00 |
| CorpusNet-Router v0 | 0,00 | 0,00 | 0,00 |
| CorpusNet-Router v0 avec abstention | 0,00 | 0,00 | 0,56 |

## Décision

`experimental_not_preferred` : le réseau v0 ne dépasse pas la baseline sur ce
test interne. Il reste un artefact d'architecture et ne doit ni remplacer la
baseline, ni router des demandes utilisateur, ni être présenté comme un gain
d'intelligence.

Le test est désormais **observé**. Il ne doit pas servir à régler des
hyperparamètres. Une nouvelle itération devra choisir ses paramètres sur train
et validation, puis être évaluée sur un nouveau jeu indépendant préenregistré.

## Portée

Ce résultat est une propriété de neuf prompts internes Corpus et de ce réseau
bag-of-words. Il ne permet aucune conclusion sur les modèles neuronaux en
général, ni sur la qualité des méthodes Corpus elles-mêmes.
