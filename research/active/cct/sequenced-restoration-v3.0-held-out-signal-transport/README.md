# CCT-EXEC 3.0 — transport tenu à l'écart des signaux (candidat)

## Lacune traitée

La version 2.9 établit une provenance interne et une calibration déclarée. Elle peut encore qualifier un signal qui mesure un substitut commode ou qui change fortement hors de ses contextes sources.

## Gain concret

Le candidat 3.0 engage avant observation un protocole de transport, puis confronte chaque marge et chaque risque à deux contextes absents de ses preuves sources. Leurs racines, contrôleurs et domaines de panne doivent être distincts des sources et entre eux. Les observations doivent arriver après l'engagement du protocole et avant le premier exercice adaptatif.

Les valeurs cibles ne sont pas recopiées. Une marge est recalculée comme la différence, en points de pourcentage, entre le taux d'essais où toutes les dettes ouvertes restent protégées par le candidat et par un rival. Un risque est recalculé comme une fréquence de panne. Chaque contexte comporte au moins 100 observations. L'écart relatif maximal d'une marge est 20 % ; l'écart absolu maximal d'un risque est 0,1. Même sous ces seuils, le plan est refusé si les valeurs cibles changent les six contextes sélectionnés par 2.8.

Le statut `bounded_held_out_signal_transport_candidate` établit seulement la persistance de ces mesures directes dans deux contextes synthétiques préengagés. Il ne prouve ni leur validité dans le monde réel, ni l'indépendance réelle des équipes, ni leur transport au-delà des contextes déclarés, ni un effet causal ou territorial.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v3.0-held-out-signal-transport/test.mjs
node research/active/cct/sequenced-restoration-v3.0-held-out-signal-transport/held-out/run-confrontation.mjs
```
