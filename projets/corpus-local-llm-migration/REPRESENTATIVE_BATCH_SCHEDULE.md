# Ordonnanceur déclaratif du lot représentatif

`REPRESENTATIVE_BATCH_SCHEDULE.json` est un plan de campagne et non un
exécuteur. Son état reste `not_started`. Le validateur utilise les contrats
existants de sélection de fixtures, de profils d’outils et d’admission de
délégation, sans appeler Qwen ni aucune capacité locale.

L’ordre est volontairement séquentiel : C14, C12, C05 puis C11. Les quatre cas
partagent soit la mémoire, soit la copie de travail ; les mettre en parallèle
rendrait les preuves ambiguës. Le budget déclaré est de 900 secondes et 18
appels d’outils au maximum ; ce sont des plafonds de préparation, pas une mesure
ni une autorisation.

Après chaque cas, le lot s’arrête avant le suivant si le reçu manque, si le
grader échoue, ou si le verdict du cas n’est pas `pass`. C11 est particulier :
l’erreur de quota doit apparaître **dans la simulation**, tandis que le cas est
un succès seulement si l’état antérieur est préservé et l’erreur rapportée.

```bash
python3 representative_batch_schedule.py
python3 -m unittest test_representative_batch_schedule.py
```

Avant toute exécution future, les préconditions de `delegation_admission.py`
devront être réobservées, les confirmations redemandées pour les outils à
risque, et chaque reçu devra être évalué par `scenario_graders.py`.
