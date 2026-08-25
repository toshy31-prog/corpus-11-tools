# Diversité épistémique et échecs communs fictifs

Teste l’indépendance de voies d’analyse par leur provenance complète : sources,
générateurs, code, hypothèses, mesures et modes d’échec.

`python3 tests/test_provenance_failures.py` montre que deux voies à sources
disjointes restent dépendantes par générateur et hypothèse, tandis que deux
conclusions identiques sans dépendance partagée restent deux grappes. Portée
`model_internal`.
