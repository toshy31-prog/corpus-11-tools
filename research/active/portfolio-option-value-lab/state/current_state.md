# État courant

L’ancien delta `0,2`, soustrait de deux valeurs fournies, est classé
`proxy_substitution`. Après correction du délai dû pour toute exécution
séquentielle de B, l’option gagne de `23/200` dans le monde corrélé/redondant,
tandis que l’uniforme gagne de `11/40` dans le monde indépendant/non redondant.
Portée `model_internal`.

Une faiblesse d'unité a été corrigée : information, exécutions, délai et sorties
restent des mesures brutes distinctes; le net n'existe que sous un ledger de
conversion explicite en `synthetic_decision_utility`.

## Prochaine action interne utile

Calculer les frontières exactes des taux de conversion, du délai et de la
redondance où le classement s’inverse, sans exporter la base utilitaire du
modèle.
