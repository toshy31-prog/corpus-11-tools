# Arène de preuves indépendantes

## Objet

Mesurer, dans des problèmes fictifs gelés à l’avance, si une méthode de
recherche issue de Corpus améliore une décision comparée à une procédure témoin
crédible.

L’arène n’est ni une vitrine du plugin ni un banc de tests logiciels. Elle
cherche un effet décisionnel observable, y compris un résultat négatif.

## Premier protocole admissible

- sélectionner des cas fictifs, séparés par construction de la méthode évaluée ;
- documenter avec l’exécution question, données autorisées, procédure Corpus, procédure témoin, critères, budget et règle d’arrêt ;
- séparer l’exécutant, l’évaluateur et, si possible, l’identité des méthodes ;
- mesurer correction réobservée, capacité à abandonner un doublon, délai, charge de maintenance et effets indésirables ;
- publier aussi les exécutions sans avantage.

## Décision et arrêt

Une méthode n’est pas promue par une bonne démonstration unique. Elle requiert
un effet répliqué dans des mondes fictifs distincts, ou une explication de son
échec qui change la décision suivante. Sa portée reste interne au protocole
fictif ; aucune observation extérieure n'est sollicitée.

Voir [`state/current_state.md`](state/current_state.md).

## Graphes de lignage v0.2

`python3 tests/test_lineage_graphs.py` classe quatre DAG fictifs par ancêtres et
empreintes de dépendance déclarées. Une différence de seed, d'identifiant ou
d'étiquette ne suffit plus à établir une séparation; deux générateurs sous des
identifiants distincts mais avec la même empreinte restent un mode commun. Les
empreintes sont des hypothèses de la fixture, pas une preuve d'équivalence; voir
[`protocols/lineage_graphs_v0.2.md`](protocols/lineage_graphs_v0.2.md).
