# DoctrineCorpusNet v1 — premier entraînement réel

## Exécution observée

Le compilateur a indexé 964 documents textuels hors du projet de modèle lui-même :
171 carriers produit, 775 recherches, 10 transferts, une archive et sept
documents de workspace. Ensemble, ils représentent 1 380 506 tokens. Une passe
skip-gram locale a effectué 365 816 mises à jour avec trois négatifs par paire.

## Ce qui est établi

Le projet possède désormais un entraînement neuronal auto-supervisé effectif
sur l'écosystème textuel Corpus, exécutable sans API ni modèle externe. Chaque
document contributeur conserve une surface et un statut dans le manifest.

## Ce qui échoue actuellement

La géométrie des mots ne suffit pas à valider la récupération : les prototypes
de capabilities, construits par moyenne de documents longs, sont presque tous
proches. La récupération par cosinus ne discrimine donc pas correctement les
capabilities.
`DoctrineCorpusNet v1` est `locally_trained_retrieval_not_selected`.

## Conséquence

La prochaine variante devra améliorer l'objectif d'entraînement — par exemple
des paires passage-capability statutées et des négatifs contrastifs — puis être
sélectionnée sur un benchmark gelé inédit. Il serait incorrect de déclarer que
le modèle « connaît la doctrine » à partir de la seule baisse de perte.
