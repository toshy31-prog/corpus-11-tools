# Mini-grammaire multilingue fictive v0.2

Le protocole a été fixé avant exécution. La portée est `pipeline_verified`.

Le générateur produit cinq triplets dans une grammaire contrôlée
français–anglais–allemand. Un parseur par langue reconstruit huit slots, dont
négation, modalité et attribution, puis compare surface, slots déclarés et
paquets entre langues. Les invariants sont la présence de tous les slots, la
comparaison sans langue pivot privilégiée et la détection d'une différence de
surface même lorsque les slots fournis restent identiques.

Les contrôles couvrent alignement, négation masquée, modalité, attribution et
portée. La grammaire pré-code son lexique et ne mesure aucune traduction libre.
Retirer le résultat si une variation contrôlée de négation, modalité,
attribution ou portée passe sans divergence.
