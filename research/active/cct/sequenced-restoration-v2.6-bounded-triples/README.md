# CCT-EXEC 2.6 — interactions triples bornées (candidat)

## Lacune traitée

La version 2.5 confronte toutes les paires de classes, mais ne peut pas révéler une rupture qui n'apparaît qu'à l'arrivée d'une troisième dépendance. L'énumération exhaustive des 84 triples et de leurs 504 ordres serait complète pour neuf classes, mais elle croît trop vite pour servir de règle générale.

## Gain concret

Le candidat 2.6 construit un plan affine déterministe de 12 triples. Chacune des 36 paires apparaît exactement une fois dans un contexte triple, chacune des neuf classes apparaît quatre fois, et les six ordres de chaque triple sont exercés. Les 72 séquences appliquent une, puis deux, puis trois perturbations ; chaque composant reste individuellement sous son seuil et chaque dette ouverte doit rester protégée à chaque tick. Une couverture incomplète, un ordre absent, une fenêtre lacunaire ou une rupture locale interdit le pont.

Le statut `bounded_three_way_interaction_candidate` ne prouve pas l'exhaustivité des interactions triples : chaque paire n'est observée qu'avec une troisième classe déterminée par le plan. Il ne couvre pas non plus les interactions d'ordre quatre ou supérieur.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v2.6-bounded-triples/test.mjs
node research/active/cct/sequenced-restoration-v2.6-bounded-triples/held-out/run-confrontation.mjs
```
