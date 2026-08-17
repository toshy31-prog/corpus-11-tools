# Interfaces du paquet CCT-EXEC-0.1

## Flux principal

1. La constitution décrit les acteurs, déclencheurs, invariants, traces, recours, arrêts et restitutions admissibles.
2. Une décision candidate est validée statiquement contre cette constitution.
3. CCT Ops matérialise localement propositions, décisions, mandats, recours et pouvoirs temporaires.
4. Les modèles économiques et P-005 produisent des résultats synthétiques séparés par porte constitutionnelle.
5. Le registre de preuves attribue à chaque revendication son niveau réel de cycle de vie.
6. Les pilotes n'acceptent une activation qu'après autorisation externe, propriétaire d'arrêt et budget de réparation.

## Contrats minimaux

| Producteur | Sortie | Consommateur | Contrôle |
|---|---|---|---|
| Constitution | décision JSON valide | opérateur/pilote | validation structurelle et croisée |
| CCT Ops | journal JSONL + export JSON | audit extérieur | chaîne, séparations, échéances |
| Économie | CSV + verdict JSON | assemblée de recherche | chocs appariés, portes séparées |
| P-005 | CSV + verdict + sensibilité | conception v0.12 | viabilité distincte du gain de rendement |
| Calibration | observations par paramètre | modèles | propriétaire, canal, fenêtre et décision |
| Pilote | traces et coûts par porteur | registre de preuves | aucune promotion automatique |

## Non-intégrations assumées

- La constitution ne signe pas cryptographiquement les décisions.
- CCT Ops ne connaît pas encore tous les schémas constitutionnels et n'est pas un système de vote.
- Les modèles n'ingèrent aucune donnée personnelle ou territoriale réelle.
- Aucun composant ne possède d'autorité de déploiement.

Ces coupures empêchent une fausse impression de système achevé. Elles définissent les prochains contrats techniques à construire après revue indépendante.
