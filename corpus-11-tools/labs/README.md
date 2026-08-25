# Corpus Labs

Ce dossier contient les instruments génériques d’expérimentation livrés avec Corpus. Ils restent utilisables si toutes les recherches particulières du dépôt sont retirées.

## Instruments

- `experiment-lab/` : moteur neutre d’expériences, verrouillage et attestation d’exécutions, contrôles, reproductibilité et Open Experiment Arena ;
- `epistemic-trajectory/` : garde générique des changements de représentation — registre des gains/pertes, dissolution des primitives, réouverture après fusion, oubli reconstructible et séparation entre critère de sélection et propriété attribuée au système ;
- `python/corpus_labs/simulation_campaign.py` : moteur d'exploration appariée — possibilités × scénarios × répétitions, aléa commun, budgets comparables, quantiles déclarés, règles de frontière, relations vectorielles et variations de sensibilité bornées.
- `python/corpus_labs/event_store.py` et `institutional_protocol.py` : journal
  append-only récupérable et machine configurable de propositions, décisions,
  recours, mandats et pouvoirs temporaires ; aucun rôle, conflit de rôles ou
  plafond de durée institutionnel n'est fourni par défaut : l'adaptateur doit
  injecter explicitement toute sa politique.
- `python/corpus_labs/json_schema_subset.py` : validateur sans dépendance d'un
  sous-ensemble JSON Schema explicitement borné ; tout mot-clé hors contrat est
  refusé au lieu d'être silencieusement ignoré.

L’exécuteur reçoit les possibilités, scénarios, orientations des métriques,
quantiles et règles de perte depuis la recherche appelante. Chaque appel reçoit
un contexte explicite contenant les identifiants de la possibilité, du scénario
et de la répétition. Le moteur conserve chaque exécution, résume séparément
chaque dimension. Pour chaque paire, il conserve l'équivalence, la relation de
borne locale ou l'incomparabilité ; plusieurs possibilités peuvent donc rester
simultanément non éliminées. Il ne produit aucun score composite, vainqueur ou
interprétation des métriques. `run_campaign` reste un adaptateur de vocabulaire
pour les consommateurs antérieurs.

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
