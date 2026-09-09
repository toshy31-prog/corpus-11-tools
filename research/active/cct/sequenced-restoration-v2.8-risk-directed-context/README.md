# CCT-EXEC 2.8 — contexte dirigé par le risque (candidat)

## Lacune traitée

La version 2.7 ajoute un second contexte triple fixe à chaque paire. Elle ne dit pas quels contextes supplémentaires tester lorsque les marges observées diffèrent fortement.

## Gain concret

Le candidat 2.8 classe les 36 paires par marge minimale de protection et retient déterministement les six plus faibles. Pour chacune, il choisit la classe restante au score de risque le plus élevé, en excluant les deux contextes déjà couverts et les triples déjà programmés. Ces six triples ajoutent 36 séquences ordonnées.

Le plan dérivé est condensé en SHA-256 et doit être engagé avant le premier exercice. Toute modification ultérieure des marges, scores ou choix invalide l'engagement. Chaque composant reste sous son seuil et chaque dette ouverte doit rester protégée à chaque préfixe d'ordre.

Le statut `bounded_risk_directed_context_candidate` n'établit pas l'indépendance réelle des marges ou scores déclarés, ni l'exhaustivité des interactions. Il empêche seulement que leur incohérence interne ou une sélection rétrospective soit assimilée à une preuve suffisante.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v2.8-risk-directed-context/test.mjs
node research/active/cct/sequenced-restoration-v2.8-risk-directed-context/held-out/run-confrontation.mjs
```
