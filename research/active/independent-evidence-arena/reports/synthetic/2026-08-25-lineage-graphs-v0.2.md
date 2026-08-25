# Résultat — graphes de dépendance v0.2

- Commande : `python3 tests/test_lineage_graphs.py`
- Portée : `pipeline_verified`
- Protocole fixé avant exécution : oui.
- Générateur : quatre DAG fictifs de lignage.
- Paramètres : données, générateurs, seeds, codes, oracles, terminaux et
  empreintes de dépendance déclarées.
- Invariants : acyclicité, identifiants uniques, parents résolus, empreinte
  présente et regroupement par `(kind, fingerprint)`.
- Contrôles : mêmes générateur/oracle, mêmes données avec codes distincts et
  deux pipelines disjoints, plus deux IDs de générateur de même empreinte.
- Résultat : le même générateur sous nouveaux seeds reste un mode commun; un
  nouveau code sur mêmes données est partiellement séparé; deux DAG fictifs
  disjoints sont seulement `procedurally_separated`; deux IDs partageant une
  empreinte restent un mode commun.
- Effet de méthode : catégories et empreintes sont fixées par la fixture; leur
  équivalence n'est pas établie indépendamment.
- Condition de retrait : empreinte commune non signalée ou séparation déduite
  du seul identifiant.
