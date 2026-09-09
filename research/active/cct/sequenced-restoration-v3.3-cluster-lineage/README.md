# CCT-EXEC 3.3 — lignée des grappes (candidat)

## Lacune traitée

La version 3.2 exige des identifiants de grappes distincts, mais des étiquettes différentes peuvent encore désigner des observations issues du même événement, du même générateur ou du même contrôle opérationnel.

## Gain concret

Le candidat 3.3 engage avant les résultats cinq coordonnées par grappe : unité d'échantillonnage, événement, générateur, contrôleur et domaine de panne. Les trois premières racines doivent être uniques dans les deux contextes d'un signal. Chaque contexte exige au moins deux contrôleurs et deux domaines de panne ; aucun ne peut couvrir plus de la moitié des grappes.

Une confrontation tenue à l'écart renomme 80 grappes tout en leur donnant un générateur commun. Elle passe encore les contrôles de taille et de réconciliation de 3.2, mais 3.3 bloque le signal avec `cluster_lineage_dependent`.

Le statut `bounded_cluster_lineage_transport_candidate` établit seulement la cohérence de la lignée déclarée. Il ne prouve ni la véracité des racines, ni l'absence d'une cause commune cachée, ni la représentativité des grappes.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v3.3-cluster-lineage/test.mjs
node research/active/cct/sequenced-restoration-v3.3-cluster-lineage/held-out/run-confrontation.mjs
```
