# Protocole v1.7 — apprentissage des transitions Corpus

## Question

À partir d’un état antérieur et d’un événement observé, un modèle prédit-il une
propriété limitée de la transition mieux qu’une baseline figée ?

## Conditions d’entrée

- au moins 10 transitions réelles enregistrées par le registre temporel ;
- au moins 50 changements cumulés de matériaux ou de relations ;
- chaque transition porte deux empreintes, avant/après, et une provenance ;
- aucune transition n’est créée pour atteindre ce seuil.

## Baseline obligatoire

La baseline est un prédicteur de persistance : « aucune relation ne change ».
Elle est évaluée sur la même partition que le modèle. Une variante neuronale ne
peut être ouverte au test que si elle dépasse la baseline sur validation dans
une métrique préenregistrée, et si le gain n’est pas porté par une seule
transition ou un seul type de matériau.

## Partition et sélection

Les unités sont des événements de transition, jamais des lignes ou fichiers
isolés. Train/validation/test sont répartis par période ou par empreinte de
transition, afin qu’un même changement ne traverse pas les partitions. Le test
reste fermé ; le nombre de pas, architecture et seuils sont décidés sur
validation uniquement.

## Limites

Prédire une transition observée ne prouve ni compréhension, ni intention, ni
mémoire subjective. Le modèle doit seulement établir une valeur prédictive
locale et reproductible par rapport à la baseline.
