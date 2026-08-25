# Registre synthétique et score de Brier

## Construit et portée

Le construit est le score de Brier d’un registre fermé de prévisions. Les
probabilités et résultats sont définis dans le fixture ; leur agrégation est une
conclusion `formal_exact` sur ce registre, non une calibration de Corpus dans le
monde.

## Invariants et contrôles

- probabilités dans l’intervalle fermé [0, 1] ;
- résultats binaires observés dans le registre ;
- horizon explicitement fermé ;
- calcul moyen sans transformation cachée ni sélection a posteriori.

## Effet de méthode et retrait

Le générateur définit les résultats, donc aucune validité prospective n’est
inférée. Retirer cette démonstration si une règle de score ou un horizon réel
différent est nécessaire.
