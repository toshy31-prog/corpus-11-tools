# Détection synthétique de mode commun

## Construit et portée

Le fixture représente trois voies d’analyse et leurs sources déclarées. Le
calcul détecte le recouvrement de dépendances ; il établit un résultat
`model_internal` sur ce graphe, pas l’indépendance d’agents ou de sources réels.

## Invariants et contrôle

Les chemins restent séparés comme objets, mais une conclusion commune fondée
sur une même source centrale est signalée. Le test refuse de compter le nombre
de chemins comme nombre de preuves indépendantes.

## Retrait

Réviser le modèle si une mesure d’indépendance empirique requiert une chaîne de
production, un générateur ou une histoire d’exposition non représentés.
