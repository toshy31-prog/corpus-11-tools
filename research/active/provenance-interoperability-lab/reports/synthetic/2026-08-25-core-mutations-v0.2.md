# Résultat — mutations de provenance v0.2

- Commande : `python3 tests/test_core_mutations.py`
- Portée : `pipeline_verified`
- Protocole fixé avant exécution : oui.
- Générateur : mutation unitaire des quinze scalaires puis sérialisation JSON.
- Paramètres : noyau, deux profils et politique de perte de `display_note`.
- Invariants : noyau exact, `receipt_id` et attribution conservés, perte hors
  noyau déclarée.
- Contrôles : quinze mutations dans chacun des deux profils.
- Résultat : deux profils conservent quinze mutations scalaires chacune;
  `receipt_id` et l'attribution font partie du noyau, tandis que la perte de
  `display_note` est déclarée.
- Effet de méthode : les deux adaptateurs sont locaux et peuvent partager des
  modes d'échec.
- Condition de retrait : mutation du noyau absorbée ou perte silencieuse.
