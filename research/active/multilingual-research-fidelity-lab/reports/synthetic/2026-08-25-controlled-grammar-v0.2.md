# Résultat — mini-grammaire v0.2

- Commande : `python3 tests/test_controlled_grammar.py`
- Portée : `pipeline_verified`
- Protocole fixé avant exécution : oui.
- Générateur : cinq triplets issus d'une grammaire fictive contrôlée.
- Paramètres : trois lexiques et huit slots sémantiques.
- Invariants : surface comparée aux slots, comparaison sans pivot privilégié
  et slots requis complets.
- Contrôles : alignement, négation, modalité, attribution et portée.
- Résultat : 5/5 triplets fictifs; le contrôle détecte une négation de surface
  cachée par des slots inchangés, ainsi que les dérives de modalité,
  attribution et portée.
- Effet de méthode : le lexique pré-code le sens; fidélité établie uniquement
  pour cette grammaire.
- Condition de retrait : une mutation déclarée non détectée.
