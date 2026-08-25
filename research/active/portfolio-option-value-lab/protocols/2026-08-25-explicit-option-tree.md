# Protocole fixé avant exécution — arbre de valeur d’option

## Portée et générateur

`model_internal`. `tests/test_explicit_option_tree.py` énumère deux issues
binaires `(A,B)` sous deux distributions exactes en `Fraction`.

## Paramètres et invariants

Les quantités brutes restent séparées : unités d'information, exécutions,
événements de délai et sorties réutilisables. Un ledger de conversion fixé avant
exécution les projette explicitement dans l'unité fictive commune
`synthetic_decision_utility` : information `+1`, exécution `-1/5`, événement de
délai `-1/5`, sortie réutilisable `+1/20`. Les probabilités de chaque monde
somment à un. Le monde corrélé a covariance `9/100`; le monde indépendant
covariance nulle. L’option exécute B seulement si A échoue ; l’uniforme exécute
A et B sans délai. Toute exécution séquentielle de B paie un événement de délai,
que B réussisse ou échoue.

## Contrôles, effet et retrait

Les mondes corrélé/redondant et indépendant/non redondant sont des rivaux
symétriques capables de faire perdre chaque politique. Probabilités et taux de
conversion utilitaire sont des primitives du modèle, pas des équivalences
externes. Retirer tout conseil général si une politique ne peut plus perdre, si
des unités brutes sont additionnées directement ou si un taux est introduit
après le résultat.
