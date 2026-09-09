# CCT-EXEC 10.13 — couverture minimax de l’enveloppe

## Lacune fermée

La couche 10.12 rendait visibles six tailles d’effet rivales, mais ne disait pas
quelle taille d’échantillon retenir lorsqu’une décision prétend les couvrir
toutes. Il restait donc possible de choisir après coup l’alternative peu
coûteuse `p = 0,25` et ses 88 bits par lot.

## Gain concret

La règle préengagée `cover_all_precommitted_alternatives` prend le maximum des
plans de puissance de l’enveloppe. La capacité requise devient donc 574 bits par
lot, imposée par `p = 0,40`. Une revendication de couverture complète avec 88
bits est rejetée, comme toute sélection après coup d’une seule alternative.

Atteindre 574 bits ne prouve toutefois ni l’indépendance, ni la plausibilité ou
l’exhaustivité de l’enveloppe : cela crée seulement l’éligibilité du dessin à
une collecte ultérieure. La conclusion forte reste fermée sans données réelles.

## Vérification

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```

## Condition de retrait

Retirer cette couche si elle accepte une couverture complète sous 574 bits,
autorise une sélection post hoc, ou transforme la seule capacité de collecte en
preuve d’indépendance.
