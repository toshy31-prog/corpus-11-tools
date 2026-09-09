# CCT-EXEC 2.4 — composition sous le seuil (candidat)

## Lacune traitée

La version 2.3 vérifie la détectabilité au seuil matériel annoncé. Plusieurs dépendances plus faibles pouvaient pourtant s'additionner ou interagir jusqu'à produire ensemble une perte matérielle.

## Gain concret

Pour chacune des neuf classes minimales, 2.4 compose au moins deux racines individuellement sous le seuil. La composition doit être matérielle sous deux cartes d'agrégation ayant des contrôleurs et racines de source distincts, puis chaque dette ouverte doit rester protégée à chaque tick. Une divergence entre cartes, une lignée commune ou une rupture transitoire maintient la tolérance `not_established`.

Le verdict positif `bounded_subthreshold_tolerance_candidate` ne couvre que les compositions et cartes effectivement éprouvées. Il n'établit ni toutes les interactions intra-classe, ni les interactions entre classes.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v2.4-subthreshold-composition/test.mjs
node research/active/cct/sequenced-restoration-v2.4-subthreshold-composition/held-out/run-confrontation.mjs
```
