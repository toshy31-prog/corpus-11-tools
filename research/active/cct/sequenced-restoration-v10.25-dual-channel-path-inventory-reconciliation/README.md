# CCT-EXEC 10.25 — rapprochement bicancal de l’inventaire des chemins

## Lacune fermée

10.24 couvrait l’inventaire déclaré sans tester si des voies d’exécution avaient
été omises.

## Gain concret

Le graphe de configuration et une découverte runtime, issus de racines de scan
distinctes et antérieures au gel, doivent chacun correspondre exactement à
l’inventaire. Toute voie supplémentaire ou manquante bloque la réconciliation.

Cette concordance établit l’exhaustivité relativement aux deux canaux déclarés,
pas l’absence absolue d’une voie invisible aux deux.

## Condition de retrait

Retirer cette couche si deux rapports issus du même scanner comptent comme
indépendants, ou si une divergence est absorbée sans réouverture de l’inventaire.
