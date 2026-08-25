# Protocole fixé avant exécution — confluence d’ordre

## Portée

`formal_exact` sur le simulateur discret et sur la projection
`payload_present_nodes`.

## Générateur et paramètres

`tests/test_order_confluence.py` énumère les 27 états initiaux de trois nœuds
dans `{empty,payload,tombstone}`, trois sources, deux politiques et les deux
ordres du même ensemble de cibles : `27 × 3 × 2 × 2 = 324` exécutions.

## Oracle, invariants et contrôles

L’oracle simultané lit un snapshot commun. `payload_wins` diffuse l’état
initial de la source. `tombstone_wins` met les trois nœuds en tombstone si le
snapshot en contient au moins un ; sinon il diffuse la source. Les cibles, la
source et l’état initial restent appariés entre les deux ordres. La politique
`payload_wins` sert de contrôle de confluence.

## Effet du protocole et retrait

L’oracle atomique est un rival de modèle, pas une vérité externe. Le verdict
porte sur la dépendance au parcours de liste. Le retirer si l’énumération n’est
plus complète, si l’espace d’états change ou si la projection de payload ne
reconstruit plus la sortie testée.
