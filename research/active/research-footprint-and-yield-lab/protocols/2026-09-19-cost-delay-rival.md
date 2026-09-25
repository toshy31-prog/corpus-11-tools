# Rival fictif coût–délai — contrat fixé avant exécution

Portée : `pipeline_verified`. Aucun coût réel ni résultat indépendant n’est
mesuré. Le cas est construit pour exercer la comparaison, pas pour estimer la
fréquence de ce compromis dans les recherches réelles.

Référence : journal `structured` existant. Rival : mêmes question, états,
événements et sorties ; seul le premier événement passe de 600 à 300 jetons et
de 20 à 40 minutes. Les appels et porteurs de charge restent inchangés.

La comparaison renvoie les différences rival moins référence séparément pour
jetons, minutes et appels. La dominance exige aucune dégradation et au moins
une amélioration. Des signes opposés imposent `tradeoff`, sans somme pondérée.
Des coûts identiques donnent `equal_costs`, sans affirmer une équivalence générale.
Question, états ou sorties différents imposent `unmatched` avant le classement.

Contrôles : dominance historique conservée, comparaison inversée, égalité,
et remplacement de la sortie du premier événement par la sortie finale déjà
existante (perte d’une sortie distincte malgré la même décision finale).

Retirer le résultat si la perte de sortie est classée comme économie comparable,
si le compromis reçoit un vainqueur ou si une dimension est agrégée. Cette
exécution ne modifie pas le verdict `weakened` du protocole initial.
