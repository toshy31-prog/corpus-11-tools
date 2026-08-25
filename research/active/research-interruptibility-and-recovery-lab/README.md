# Interruptibilité et récupération de recherche fictive

Teste un pipeline déterministe à quatre étapes, ses coupures, ses artefacts
hashés et ses dépendances sérialisées. Le simple fait de recopier un snapshot
n’est plus traité comme une reprise.

`python3 tests/test_cutpoint_recovery.py` vérifie quatre coupures et un contrôle
où une dépendance d’exécution est omise. Portée : `pipeline_verified`.
