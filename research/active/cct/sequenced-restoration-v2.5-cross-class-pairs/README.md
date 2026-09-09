# CCT-EXEC 2.5 — interactions entre classes (candidat)

## Lacune traitée

La version 2.4 compose plusieurs racines au sein d'une même classe. Elle ne confronte pas une dépendance d'une classe à celle d'une autre, ni l'effet de leur ordre d'apparition.

## Gain concret

Le candidat 2.5 préfixe les 36 paires non ordonnées des neuf classes minimales. Chaque paire est exercée dans les deux ordres. Au premier tick, seule la première classe est perturbée ; aux ticks suivants, les deux le sont. Chaque composant reste individuellement sous son seuil et chaque dette ouverte doit rester protégée à chaque tick. Une séquence absente, un ordre non appliqué ou une rupture locale interdit le pont.

Le statut `bounded_pairwise_cross_class_candidate` ne couvre ni les interactions triples ou supérieures, ni toutes les intensités possibles.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v2.5-cross-class-pairs/test.mjs
node research/active/cct/sequenced-restoration-v2.5-cross-class-pairs/held-out/run-confrontation.mjs
```

