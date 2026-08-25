# Protocole fixé avant exécution — coupures et reprise

## Portée et générateur

`pipeline_verified`. Un processus fictif déterministe exécute `frame`,
`compare`, `decide`, `report` et produit une chaîne SHA-256.

## Paramètres, invariants et contrôles

Les quatre coupures possibles sont reprises depuis un snapshot JSON. Identité,
curseur, décision, artefacts, recours et dépendance `tie-break-v1` doivent être
conservés. Le contrôle négatif retire uniquement cette dépendance et utilise un
fallback déclaré.

## Effet du protocole et retrait

Le générateur encode le rôle de la dépendance dans `decide` et `report`; il
vérifie la complétude de ce pipeline, non une récupération universelle. Retirer
le verdict si les hashes ne reconstruisent plus la baseline ou si le contrôle
omis ne diverge plus.
