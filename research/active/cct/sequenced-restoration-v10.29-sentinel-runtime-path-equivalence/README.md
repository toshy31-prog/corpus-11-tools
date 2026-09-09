# CCT-EXEC 10.29 — équivalence sentinelle–chemin runtime

## Lacune fermée

10.28 validait les propriétés internes des sentinelles sans les comparer à des
chemins cibles distincts.

## Gain concret

Chaque sentinelle est appariée à un chemin runtime distinct. Nombre d’entrées,
profondeur d’alias, délai d’activation et privilège requis doivent correspondre,
et le chemin cible doit lui-même produire une trace de blocage. Une sentinelle
plus facile à bloquer ne peut donc plus valider le chemin réel.

Les chemins appariés restent des fixtures synthétiques : la couche établit la
capacité de comparaison, pas une observation d’un runtime déployé. Les
dimensions non mesurées restent hors conclusion.

## Condition de retrait

Retirer cette couche si une paire structurellement divergente, identique à la
sentinelle ou sans blocage cible observable conserve l’équivalence.
