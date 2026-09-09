# CCT-EXEC 2.1 — continuité temporelle sous basculement (candidat)

## Lacune traitée

La version 2.0 prouve qu'après retrait abstrait d'une voie, les autres voies déclarent encore couvrir toutes les dettes ouvertes. Elle ne montre pas que cette couverture reste effective pendant le basculement : une interruption brève pouvait disparaître derrière un résultat final favorable.

## Gain concret

Le candidat 2.1 exige un essai borné pour la perte de **chaque** voie. Chaque tick de la fenêtre doit être observé et conserver la protection de chaque axe de dette ouvert. Cette protection doit être à la fois rapportée et supportée par au moins une voie active. Une mesure absente, une perturbation non appliquée ou une rupture même transitoire maintient la continuité `unestablished`; les résultats ne sont ni moyennés ni compensés par une récupération ultérieure.

Le statut positif reste `observed_continuity_candidate`. Il ne prouve ni autorisation, ni déploiement, ni robustesse externe, ni indépendance réelle des voies.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v2.1-temporal-failover/test.mjs
node research/active/cct/sequenced-restoration-v2.1-temporal-failover/held-out/run-confrontation.mjs
```
