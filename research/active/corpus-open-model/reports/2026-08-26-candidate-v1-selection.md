# Sélection — supervision candidate v1

## Protocole

Le candidat enrichi a reçu les 14 familles `train` de la supervision candidate,
en plus des descriptions de skills et du train historique. Il a été comparé sur
les cinq familles `validation`. Les quatre familles `test` n'ont pas été lues
par le runner de sélection.

| Méthode | Recall@3 | Precision@3 |
| --- | ---: | ---: |
| Recouvrement lexical | 0,60 | 0,20 |
| CorpusNet-Router v0 | 0,40 | 0,33 |
| Candidat enrichi | 0,20 | 0,14 |

## Décision

`not_selected`. Ajouter ces quatorze exemples à l'architecture bag-of-words ne
produit pas un gain de validation. Le test candidat v1 est conservé intact.

## Diagnostic borné

Le résultat est compatible avec plusieurs mécanismes non distingués : petit
effectif, sorties déséquilibrées, mélange de langues, absence de représentation
de l'ordre/négation, ou paramètres inadaptés. Il ne permet pas de choisir entre
eux et ne justifie pas d'optimiser sur cette validation désormais observée.
