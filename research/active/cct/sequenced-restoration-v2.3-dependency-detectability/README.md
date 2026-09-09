# CCT-EXEC 2.3 — détectabilité des dépendances (candidat)

## Lacune traitée

La version 2.2 confronte les racines de dépendance déclarées, mais un inventaire incomplet pouvait encore sembler rassurant. L'absence de dépendance inconnue n'a aucune valeur si le dispositif ne peut pas la détecter.

## Gain concret

Le candidat 2.3 fixe neuf classes minimales : contrôle, identité, données, réseau, énergie, finance, personnel, fournisseur et géographie. Pour chacune, l'audit doit annoncer un seuil matériel et faire détecter deux injections aveugles de racines distinctes, dans une fenêtre bornée, par au moins deux canaux aux contrôleurs et domaines de panne distincts. Un échec ou une lignée incomplète interdit le pont.

Le succès `bounded_inventory_detection_candidate` ne prouve pas l'exhaustivité absolue. Les dépendances sous le seuil et les classes encore non modélisées restent explicitement hors conclusion.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v2.3-dependency-detectability/test.mjs
node research/active/cct/sequenced-restoration-v2.3-dependency-detectability/held-out/run-confrontation.mjs
```

