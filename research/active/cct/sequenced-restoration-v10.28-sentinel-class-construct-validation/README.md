# CCT-EXEC 10.28 — validité des construits de classes sentinelles

## Lacune fermée

Les noms `alias`, `delayed_activation` ou `privileged` pouvaient être apposés à
des canaris ne présentant aucune propriété correspondante.

## Gain concret

Chaque cellule doit fournir un descripteur observable : entrée unique pour la
voie directe, profondeur de résolution pour l’alias, délai et trace d’activation
pour la voie différée, privilège et trace d’autorisation pour la voie
privilégiée. L’offset doit aussi appartenir à la fenêtre revendiquée.

Cela valide les construits pour les fixtures déclarées, pas leur équivalence à
des chemins réels ni leur transport externe.

## Condition de retrait

Retirer cette couche si une étiquette sans observable constitutif ou hors de sa
fenêtre conserve la validation.
