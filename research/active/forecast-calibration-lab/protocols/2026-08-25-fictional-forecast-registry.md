# Protocole fixé avant exécution — registre fictif daté

## Portée et générateur

`formal_exact` sur vingt cas. Le générateur alterne deux strates, fixe dates
d’émission et d’issue à trente jours, puis produit deux succès sur dix en strate
basse et huit sur dix en strate haute sans lire les probabilités rivales pendant
l'exécution. Cette séparation est seulement une séparation de code : calendrier
d'issues et rivaux ont été co-conçus dans le même fichier pour rendre le test
discriminant.

## Paramètres, invariants et contrôles

Rivaux : stratifié `(1/5,4/5)`, base `(1/2,1/2)`, surconfiant
`(1/20,19/20)`. Chaque strate contient dix cas ; dates strictement ordonnées et
issues postérieures. Le score vérifie exactement
`Brier = fiabilité - résolution + incertitude`.

## Effet et retrait

La fréquence par strate est produite par le générateur co-conçu ; le résultat ne
vaut que pour ce registre et n'établit aucune indépendance d'évidence. Retirer le
classement si un rival accède aux issues pendant le calcul, si les strates sont
choisies après calcul ou si la décomposition ne reconstruit plus le score.
