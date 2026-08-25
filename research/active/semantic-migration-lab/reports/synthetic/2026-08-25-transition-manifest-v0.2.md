# Résultat — manifest exact de migration v0.2

- Commande : `python3 tests/test_transition_manifest.py`
- Portée : `pipeline_verified`
- Protocole fixé avant exécution : oui.
- Générateur : application d'un manifest séparé à une sortie v1 fictive.
- Paramètres : conditions, champs et couples exacts avant/après.
- Invariants : mêmes entrées et aucune valeur cible implicite.
- Contrôles : stabilité, transition exacte, valeur illégale sur champ déclaré
  et attribution non déclarée.
- Résultat : 4/4 cas classés; la transition exacte vers `pipeline_verified`
  passe, tandis qu'une montée non autorisée vers `external_equivalent` est
  classée `unexplained_drift`.
- Effet de méthode : règles et environnements restent des fonctions fictives
  écrites dans le même dépôt.
- Condition de retrait : toute valeur cible non déclarée classée comme permise.
