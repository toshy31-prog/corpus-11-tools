# CCT-SC-D10-003 — campagne sémantique fictive

## Conclusion

Verdict : `compatible_survivors`. Les 32 mondes et 4 variations produisent 128 paires évaluées par un checker sémantique qui ne reçoit pas le nom du mécanisme.

La campagne mesure des capacités et transitions dans les machines d’état déclarées. Elle ne mesure aucune institution réelle. Le statut du protocole est auto-déclaré dans la configuration, sans verrou temporel indépendant.

## Comparaison vectorielle

- Dominances de Pareto D10 : `0` ;
- dominances du rival : `0` ;
- égalités ou compromis : `128` ;
- avantages D10 sur le seul vecteur de protection : `70` ;
- avantages du rival sur ce vecteur : `2`.

Aucun score global ne compense une porte, un recours ou une restitution perdue. Une charge visible plus basse et une meilleure protection restent donc un compromis, pas un vainqueur fabriqué.

## Checker et construit

Le checker compare la trace à l’état vrai, vérifie acteur et autorité, recalcule le ledger d’actions avec ordre de tentative et plafonds autorisés, puis reconstruit la file depuis le contenu du journal O4 et la capacité autorisée. La présence de champs seule ne suffit pas.

## Contrôles

- factoriel complet : `True` ;
- budgets appariés : `True` ;
- budget actif : `True` ;
- contrat sémantique : `True` ;
- axes fonctionnels : `load=True`, `channel=True`, `registration=True`, `decision=True`, `environment=True`;
- reconstruction déterministe : `pipeline_verified`.

## Portée et retrait

Résultat des machines d’état : `model_internal`. Reconstruction : `pipeline_verified`. Revendications non soutenues : effet institutionnel et transport externe.

Condition de retrait : Withdraw the result if a generator axis is inactive, paired worlds or effective action budgets differ, an action is executed without budget, O3 accepts an unauthorized actor, O4 accepts a false recovery log, the checker reads a mechanism label, or reconstruction changes an artifact.

Effet possible du protocole : The state machines, authority map, action ledger, event rules, recovery horizon and semantic checker fully determine the results; they are not calibrated to an institution.
