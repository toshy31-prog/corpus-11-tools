# Rapport — sélection antérieure aux résultats d'une règle de dérivation

## Classification automatique

**inconnu**

Le code verrouillé vaut `0` : un noyau commun existe, mais il ne dépasse pas le contrôle par familles de règles aléatoires appariées. La dépendance complète à la convention n'est pas déclenchée, et l'invariance sous famille de règles n'est pas établie selon le seuil préenregistré.

## Famille et sélection préenregistrées

Cinq règles admissibles ont été appliquées à chacun des `32 768` graphes : tous les contextes maximaux, les plus grands, les plus petits, ceux de recouvrement maximal et ceux de recouvrement minimal. Toutes sont déterministes, sans seuil numérique libre et invariantes par renommage.

La règle `all_maximal` a été sélectionnée avant calcul par le tuple de simplicité verrouillé : aucun paramètre, aucune étiquette ou graine, nombre minimal de primitives, puis identifiant lexical.

## Résultats

- Graphes exactement invariants sous les cinq règles : `1 268`.
- Graphes possédant un noyau strict commun : `1 268`.
- Graphes avec une relation sous au moins une règle mais aucun noyau commun : `30 600`.
- Relations strictes communes aux cinq règles : `3 990`.
- Relations communes aux règles aléatoires appariées : `4 491`.
- Avantage du noyau admissible sur le contrôle aléatoire : `-501`.
- Relations produites par la règle sélectionnée : `124 800`.
- Relations de la règle sélectionnée absentes d'au moins une autre règle admissible : `120 810`.

## Contrôles

- Univers exhaustif : réussi, `32 768 / 32 768`.
- Sélection par simplicité : réussie, `all_maximal`.
- Invariance par renommage : `0` écart.
- Appariement aléatoire du nombre de contextes : `0` écart.
- Graphes vide et complet : `0` écart.
- Budget d'accès : `6 / 6`.
- Reconstruction : `2/2` artefacts identiques octet par octet.

## Conclusion bornée

Une règle peut être choisie formellement sans consulter les résultats, mais ce protocole ne montre pas que ce choix isole une structure commune supérieure au hasard apparié. La famille n'est pas entièrement conventionnelle, puisqu'un noyau commun non vide existe, mais ce noyau est plus petit que celui du contrôle aléatoire dans la comparaison verrouillée.

Le verdict reste donc `inconnu`. Aucun critère scientifique de sélection entre règles n'est établi ici, et aucune interprétation physique n'est permise.

## Empreintes

- `protocol_hash` : `sha256:60c3f48eba8c96480847b3fccb45f5716746c5ce2de4dda64acd12252cc7cfa1`
- `experiment_fingerprint` : `sha256:5d7e79865612b9ba05cc921f8cd2cf4a50206c58b982ddad71bfd976e1e54a50`
- `raw_hash` : `sha256:96c733ae48f09916205a8608e763ef5a73ee7dbd6b3f5b17ccddd773c42d1583`
- `classification_hash` : `sha256:7b7f80ecf509e6fd75bb5908c43aac2c18fca325c66f68f1671955ba5ceb925f`
