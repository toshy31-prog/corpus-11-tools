# Dépendances et exécution — FOE-001, seconde implémentation

- Langage : Python 3.
- Version d’exécution : relevée par `python3 --version` lors de l’exécution.
- Paquets tiers : aucun ; uniquement la bibliothèque standard (`argparse`,
  `hashlib`, `json`, `pathlib`, `typing`, `unittest`).
- Entrées lues par l’implémentation : le protocole et le fixture FOE-001 gelés.
- Sortie conservée : `execution_report.json`, générée par la commande ci-dessous.

Commande de test et de production du rapport :

```bash
python3 research/foe_001_second_implementation/foe001_independent.py --protocol research/FOUNDATIONS_OF_EVIDENCE_PROTOCOL_v0.1.md --fixture research/fixtures/foundations_of_evidence_foe_001.json --write-report research/foe_001_second_implementation/execution_report.json && python3 -m unittest -v research/foe_001_second_implementation/test_foe001_independent.py
```
