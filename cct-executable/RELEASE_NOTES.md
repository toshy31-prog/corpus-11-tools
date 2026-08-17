# CCT-EXEC-0.1 — note de livraison

Date de gel : 17 août 2026.

## Résultat vérifié

- 10 contrôles d'intégration sur 10 réussissent ;
- 83 tests unitaires réussissent : 15 constitution, 8 économie, 21 opérations, 38 laboratoire et 1 cohérence de pile ;
- 5 760 simulations économiques appariées sont régénérées ;
- la décision constitutionnelle invalide est refusée pour neuf violations nommées ;
- la démonstration opérationnelle produit 19 événements, conserve une chaîne de traces valide et refuse l'exercice d'un pouvoir échu ;
- les six variations P-005 sont régénérées.

Commande de reproduction :

```bash
cd cct-executable
python3 run_all.py
```

## Conclusions qui changent la décision

1. Aucun régime économique testé n'est une solution générale : les quatre échouent quatre à cinq portes dans la polycrise complète.
2. Trois candidats restent compatibles hors généralisation ; la planification négociée distribuée est rejetée dans la portée du modèle car dominée dans cinq scènes.
3. La viabilité synthétique de la candidate v0.12 résiste aux variations déclarées, mais son gain face à v0.11 n'est plus établi sous leur combinaison pessimiste.
4. Le prochain passage rationnel n'est donc pas une généralisation : c'est une calibration indépendante de CAL01–CAL12, puis des pilotes non coercitifs P-000, P-003 et P-006 soumis à autorisation externe.

## Niveau de réalité

Niveau maximal établi : `tested` localement. Le paquet n'est ni autorisé, ni déployé, ni réobservé indépendamment. Ces niveaux nécessitent des personnes, des institutions, des données et des territoires extérieurs au dépôt.
