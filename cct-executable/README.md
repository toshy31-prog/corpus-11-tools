# CCT-EXEC-0.1 — première CCT exécutable locale

Ce paquet transforme la CCT v0.12 en artefacts composables et vérifiables. Il ne crée ni gouvernement, ni droit applicable, ni déploiement territorial. Il atteint le niveau **écrit et testé localement** sur les fonctions pouvant être exercées sans autorité extérieure.

## Exécution unique

```bash
cd cct-executable
python3 run_all.py
```

La commande exécute constitution, contre-exemple, économie, opérations hors ligne, laboratoire historique et robustesse P-005. Elle écrit `verification-report.json` et `VERIFICATION.md`.

La livraison gelée totalise 84 tests unitaires et 10 contrôles d'intégration. Le détail des résultats et des conclusions de décision est consigné dans `RELEASE_NOTES.md`.

## Contenu

- `constitution/` — constitution JSON, schémas, 12 dispositions, validateur et exemples ;
- `economy/` — quatre économies rivales, 5 760 mondes synthétiques et frontières de Pareto ;
- `ops/` — CLI hors ligne, journal append-only, mandats, recours et pouvoirs temporaires ;
- `calibration/` — douze paramètres à mesurer indépendamment ;
- `pilots/` — six protocoles gradués de P-000 à P-007 ;
- `evidence/` — revendications avec niveau et limites ;
- `governance/` — proposition, refus, autorisation, arrêt, reprise et réparation séparés ;
- `integration/` — interfaces et non-intégrations explicites.

## Résultats saillants

1. La constitution refuse les décisions qui concentrent arrêt, relance et certification ou omettent invariants, traces et recours.
2. CCT Ops refuse l'auto-décision, l'auto-recours, les capacités hors périmètre et l'usage après échéance ; il détecte une altération du journal.
3. Trois économies restent compatibles dans le modèle ; la planification négociée distribuée est dominée dans cinq scènes.
4. En polycrise, les quatre économies perdent quatre à cinq portes : aucune architecture économique unique n'est admissible comme solution générale.
5. La v0.12 reste viable dans les sensibilités P-005 testées, mais son gain de rendement n'est plus établi sous la variation pessimiste composée.

## Première décision permise par le paquet

Ne pas généraliser une architecture économique. Conserver un portefeuille de mécanismes, construire les réserves physiques communes, puis calibrer CAL01–CAL12 avec des équipes extérieures avant tout pilote ayant un effet réel.

## Frontière d'autorité

Le paquet peut proposer, valider statiquement, simuler et exécuter un journal local de laboratoire. Il ne peut pas autoriser un pilote, créer une identité publique, déplacer des ressources, imposer une décision, collecter des données réelles ou déclarer une capacité robuste. Ces actes appartiennent à des personnes et institutions compétentes qui ne sont pas présentes dans ce dépôt.
