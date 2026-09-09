# CCT-EXEC 10.14 — admission prospective de l’enveloppe d’effets

## Lacune fermée

La couche 10.13 calculait correctement 574 bits par lot pour couvrir toute
l’enveloppe déclarée, mais cette enveloppe demeurait hypothétique. Un plafond
de scénario pouvait ainsi être présenté comme une exigence opérationnelle.

## Gain concret

Chaque taille d’effet doit désormais être inscrite dans l’ordre attendu avec
une source, un type d’estimation recevable, une correspondance exacte à la
population, au protocole et à l’issue cibles, des bornes d’incertitude, une
lignée indépendante et une date de gel antérieure au registre. Sans cela, 574
bits restent uniquement un **plafond de scénario** et ne peuvent fixer un
budget opérationnel.

Les entrées complètes des tests sont des fixtures synthétiques : elles prouvent
le fonctionnement de la barrière, pas la plausibilité réelle des effets. Même
une admission complète ne prouve ni collecte, ni autorisation, ni exigence
opérationnelle effective.

## Vérification

```bash
node --test test.mjs
node held-out/run-confrontation.mjs
```

## Condition de retrait

Retirer cette couche si une hypothèse sans lignée indépendante ou gel
prospectif peut fixer le budget, si une enveloppe incomplète est admise, ou si
une fixture est présentée comme observation réelle.
