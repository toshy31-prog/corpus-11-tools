# Transfert accepté — exploration d'espaces de possibilités

- Source : recherche CCT, protocoles P-001/P-002/P-005 et comparaison économique.
- Destination : `corpus-11-tools/labs/python/corpus_labs/simulation_campaign.py`.
- Extrait : aléa commun déterministe, validation de budgets appariés,
  possibilités × scénarios × répétitions, contexte d'exécution explicite,
  quantiles déclarés, règles de frontière préspécifiées, relation vectorielle
  partielle sans score composite, ensemble non éliminé et variations bornées.
- Retiré : noms CCT, architectures politiques, métriques constitutionnelles, paramètres, seuils et conclusions.
- Vérification : treize tests unitaires propres au module et campagne synthétique
  non-CCT ; les runners réels CCT-7X, P001, P002 et P005 appellent directement
  le moteur générique. Les artefacts CCT-7X-001/002 sont identiques octet par
  octet, les cinq CSV P001/P002 et les deux CSV P005 sont reproduits exactement,
  ainsi que le verdict P005-DT-002 et ses six variations historiques à 180
  répétitions. CCT-ECO-M4-001 utilise le même moteur avec `summary.csv`,
  `verdict.json` et `report.md` identiques octet par octet aux artefacts
  historiques. Aucune branche CCT n'a été ajoutée au produit.
- Condition de retrait : dépendance découverte à une configuration CCT,
  divergence entre le module et ses consommateurs, convention statistique non
  déclarée ou agrégation cachée des résultats.
