# CCT-EXEC 10.26 — détectabilité par sentinelles de chemins aveugles

## Lacune fermée

Deux canaux distincts pouvaient s’accorder parce qu’ils partageaient la même
incapacité à voir une voie cachée.

## Gain concret

Une racine tierce injecte deux chemins-canaris avant les scans et n’en révèle
l’identité qu’après ceux-ci. Chaque canal doit retrouver chaque sentinelle.
L’accord qui manque le même canari devient un échec de détectabilité.

Le succès établit la sensibilité aux sentinelles déclarées dans cette fenêtre,
pas la détectabilité de toute voie inconnue ni l’exhaustivité absolue.

## Condition de retrait

Retirer cette couche si une sentinelle manquée, un injecteur lié au scanner ou
une révélation antérieure au scan conserve l’admission.
