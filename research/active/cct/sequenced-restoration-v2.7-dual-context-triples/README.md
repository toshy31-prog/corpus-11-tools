# CCT-EXEC 2.7 — doubles contextes triples (candidat)

## Lacune traitée

La version 2.6 place chaque paire de classes dans un seul triple. Une paire peut donc réussir avec la troisième classe imposée par le plan et échouer avec une autre.

## Gain concret

Le candidat 2.7 compose deux plans affines disjoints. Chacun couvre les 36 paires exactement une fois et fait apparaître chaque classe quatre fois. Ensemble, leurs 24 triples sont distincts : chaque paire est confrontée à deux troisièmes classes différentes. Les six ordres de chaque triple produisent 144 séquences, contre 504 pour l'énumération exhaustive des 84 triples.

Chaque composant reste individuellement sous son seuil. Toute dette ouverte doit rester protégée à chaque préfixe d'ordre. L'absence d'un plan, d'un triple, d'un ordre, d'un tick ou d'un axe interdit le pont.

Le statut `bounded_dual_context_three_way_candidate` ne prouve pas l'exhaustivité : cinq troisièmes classes possibles restent non exercées pour chaque paire, ainsi que les interactions d'ordre quatre ou supérieur.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v2.7-dual-context-triples/test.mjs
node research/active/cct/sequenced-restoration-v2.7-dual-context-triples/held-out/run-confrontation.mjs
```
