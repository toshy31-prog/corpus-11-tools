# Manifest exact de migration v0.2

Le protocole a été fixé avant exécution. Sa portée est `pipeline_verified`.

Le générateur applique à une sortie v1 un manifest séparé contenant, pour
chaque règle, condition, champ, valeur initiale et valeur finale exactes. Les
paramètres sont quatre cas fictifs et quatre champs critiques. Les invariants
sont l'identité des entrées, l'exactitude du triplet `(champ, avant, après)` et
le refus de toute valeur non prédite.

Le contrôle décisif remplace `scope=pipeline_verified` par
`scope=external_equivalent` sur un champ pourtant déclaré : cette dérive doit
être refusée. Le dispositif reste écrit dans un seul dépôt et ne démontre
aucune stabilité d'environnement extérieur. Retirer le résultat si une valeur
non autorisée est classée comme transition déclarée ou si le manifest est
produit à partir de la sortie observée.
