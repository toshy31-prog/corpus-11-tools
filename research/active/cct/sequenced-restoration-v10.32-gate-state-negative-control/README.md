# CCT-EXEC 10.32 — contrôle négatif de l’état du gate

## Lacune fermée

Le harnais de 10.31 pouvait réussir en répondant toujours `blocked: true`, sans
être sensible à l’état réel du gate.

## Gain concret

Les douze cellules sont exécutées par paires : gate désactivé puis activé. Elles
doivent toutes passer de `blocked` à `passed`, avec identité et ordre conservés.
Un instrument toujours bloqué ou une classe insensible à l’état est rejeté.

Cela établit la discrimination du harnais local, pas son couplage à un gate de
production.

## Condition de retrait

Retirer cette couche si un instrument constant, une permutation des cellules ou
une classe qui ne bascule pas conserve l’admission.
