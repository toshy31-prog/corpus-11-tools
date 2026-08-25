# Taints sémantiques et automate de recours v0.2

Le protocole a été fixé avant exécution. Sa portée est `pipeline_verified`.

Le générateur matérialise trois vues d'un dossier fictif, propage les taints
déclarés lorsqu'une valeur source d'au moins quatre caractères est copiée ou
incluse textuellement dans un autre champ, et rejoue un automate minimal
`submitted → adjudicated → appealed → remedied`. Les paramètres sont les
audiences, taints interdits, seuil de quatre caractères, durées maximales,
artefacts requis et transitions.
Les invariants sont la séparation audience/finalité/rétention, la détection
d'un contenu sensible renommé, la non-vacuité des artefacts et l'arrivée
effective à l'état `remedied`.

Les contrôles couvrent fuite complète, dossier minimal, divulgation graduée,
identité cachée sous un champ autorisé sans override de taint, jeton/empreinte
vides et recours bloqué. L'effet de méthode est décisif : l'équivalence repose
sur inclusion textuelle exacte et ne détecte ni paraphrase ni inférence libre.
Le modèle ne mesure ni cryptographie, ni accès latéral, ni réparation hors de
l'automate. Retirer le résultat si une copie exacte d'un token tainté atteint
une audience sans échec ou si un chemin incomplet est déclaré complet.
