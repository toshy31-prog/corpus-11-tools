# Rapport — compatible-distinctions-order-001

## Classification automatique

**supporté dans le modèle**

La classification verrouillée est `not_triggered` : aucune des cinq conditions de renversement préenregistrées n'est satisfaite. Cette correspondance signifie uniquement que les deux prédictions du manifeste survivent dans l'univers fini spécifié.

## Calculs préenregistrés

- Univers parcouru : `32 768 / 32 768` graphes simples étiquetés.
- Graphes produisant au moins une comparaison stricte dans l'ordre quotient : `30 668`.
- Graphes sans comparaison stricte : `2 100`.
- Classes appariées contenant plusieurs signatures d'ordre : `8`.
- Hauteurs : `2 100` graphes à hauteur `1`, `22 088` à hauteur `2`, `8 580` à hauteur `3`.
- Comparaisons strictes observées : de `0` à `9`, selon l'histogramme scellé dans `raw_results.json`.

Le témoin canonique préenregistré appartient à une classe appariée sur :

- degrés triés : `[1,1,1,1,2,2]` ;
- triangles : `0` ;
- tailles des contextes maximaux : `[2,2,2,2]`.

Dans cette même classe, le masque `120` a la signature `(4 comparaisons strictes, hauteur 2, quotient 6)` et le masque `657` la signature `(2 comparaisons strictes, hauteur 2, quotient 5)`.

## Contrôles déclarés

- Exhaustivité de l'univers : réussi, `0` écart.
- Appariement des résumés locaux : appliqué sur les trois champs préenregistrés.
- Invariance par renommage : réussi, `0` écart sur `32 768` graphes.
- Contrôles négatifs vide/complet : réussis, `0` écart.
- Budget d'accès : `4 / 4` opérations autorisées.
- Reconstruction déterministe autorisée : `2/2` artefacts identiques octet par octet.

## Conclusion bornée

Dans ce modèle fini, des compatibilités non orientées suffisent à dériver un ordre d'implication non trivial, et sa signature n'est pas déterminée par la séquence des degrés, le nombre de triangles et le multiensemble des tailles des contextes maximaux.

Ce résultat ne démontre aucune émergence physique, temporelle ou objectale. Il ne montre pas non plus que l'ordre dérivé possède une capacité prédictive hors du modèle.

## Empreintes

- `protocol_hash` : `sha256:cab974cf6ae65b5723664ce3153aeac642ce5f69bb34b801a4e78db316340232`
- `experiment_fingerprint` : `sha256:6e71f633ff905f921ff9986114d69af7f3cb499a33b40171ce715b39b1d1ecec`
- `raw_hash` : `sha256:738fe6d791effb055399085b8897a6562028e6307a8904bb05694ce3702590c0`
- `classification_hash` : `sha256:bcb03f55676d5dbbd45c7e54dd18a1ea61a69f20d09d179c140650dd328b0b49`
