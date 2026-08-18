# Corpus Labs

Ce dossier contient les instruments génériques d’expérimentation livrés avec Corpus. Ils restent utilisables si toutes les recherches particulières du dépôt sont retirées.

## Instruments

- `experiment-lab/` : moteur neutre d’expériences, verrouillage de protocoles, contrôles, reproductibilité et Open Experiment Arena ;
- `epistemic-trajectory/` : garde générique des changements de représentation — registre des gains/pertes, dissolution des primitives, réouverture après fusion, oubli reconstructible et séparation entre critère de sélection et propriété attribuée au système ;
- `python/corpus_labs/simulation_campaign.py` : primitives de campagnes appariées — aléa commun, budgets comparables, dominance vectorielle et variations de sensibilité bornées.

Les fixtures et démonstrations servent à tester les instruments. Elles ne sont ni des utilisateurs, ni des observations extérieures, ni des conclusions de recherche.

## Frontière

Un laboratoire Corpus fournit un contrat d’exécution réutilisable. Les hypothèses, paramètres, populations, objets politiques, résultats et interprétations propres à une recherche restent sous [`../../research/`](../../research/).

Une recherche peut dépendre de ces instruments. Aucun instrument Corpus ne doit importer une configuration ou une conclusion depuis `research/`.

## Vérification

```bash
PYTHONPATH=corpus-11-tools/labs/python python3 -m unittest discover \
  -s corpus-11-tools/labs/python/tests -v
node --test corpus-11-tools/labs/experiment-lab/tests/*.test.mjs \
  corpus-11-tools/labs/experiment-lab/governance/tests/*.test.mjs \
  corpus-11-tools/labs/experiment-lab/arena/tests/*.test.mjs \
  corpus-11-tools/labs/epistemic-trajectory/tests/*.test.mjs
```
