# Valeur d’option du portefeuille fictif

Compare deux politiques sur des arbres finis explicites. Probabilités, coûts,
délais, réutilisation et corrélation sont des paramètres du modèle, jamais des
estimations externes.

Les unités brutes ne sont pas additionnées directement : un ledger déclaré les
convertit en `synthetic_decision_utility`. Tout classement est conditionnel à
cette base utilitaire fictive. La politique séquentielle paie le délai dès que B
est exécuté après l'échec de A, même lorsque B échoue.

Le nouvel arbre contient un monde corrélé/redondant où conserver l’option gagne
de `23/200` et un monde indépendant/non redondant où l’allocation uniforme gagne
de `11/40`. Exécution : `python3 tests/test_explicit_option_tree.py`. Portée
`model_internal`.
