# CCT-EXEC 3.4 — lignée du portefeuille (candidat)

## Lacune traitée

La version 3.3 vérifie la lignée à l'intérieur de chaque signal. Une même unité, un même événement ou un même générateur peuvent encore alimenter deux signaux différents et corréler silencieusement le plan adaptatif.

## Gain concret

Le candidat 3.4 engage et confronte ensemble les 36 marges et les neuf risques. Chacune des trois racines de lignée doit appartenir à un seul signal dans tout le portefeuille. Une collision indique son type, sa racine et les deux signaux concernés, puis bloque le plan avec `cross_signal_lineage_collision`.

La confrontation tenue à l'écart réutilise un événement entre une marge et un risque. Chaque signal conserve séparément une lignée valide selon 3.3, mais 3.4 refuse leur composition.

Le statut `bounded_portfolio_lineage_transport_candidate` établit seulement l'absence de collision dans les racines déclarées. Il ne prouve pas leur véracité ni l'absence d'une cause commune non enregistrée.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v3.4-portfolio-lineage/test.mjs
node research/active/cct/sequenced-restoration-v3.4-portfolio-lineage/held-out/run-confrontation.mjs
```
