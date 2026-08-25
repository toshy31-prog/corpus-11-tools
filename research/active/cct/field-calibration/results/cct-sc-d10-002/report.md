# CCT-SC-D10-002 — campagne sémantique fictive

> **Artefact retiré et remplacé par CCT-SC-D10-003.** Le verdict ci-dessous
> n'est plus une conclusion courante : O3 ne validait que l'inégalité des
> acteurs sans autorité déclarée, O4 ne relisait pas le contenu de
> `recovery_log`, et le budget d'actions était inerte.

## Conclusion

Verdict : `compatible_survivors`. Les 32 mondes et 3 variations produisent 96 paires évaluées par un oracle de transition qui ne reçoit pas le nom du mécanisme.

La campagne mesure des capacités et transitions dans les machines d’état déclarées. Elle ne mesure aucune institution réelle.

## Comparaison vectorielle

- Dominances de Pareto D10 : `0` ;
- dominances du rival : `0` ;
- égalités ou compromis : `96` ;
- avantages D10 sur le seul vecteur de protection : `54` ;
- avantages du rival sur ce vecteur : `0`.

Aucun score global ne compense une porte, un recours ou une restitution perdue. Une charge visible plus basse et une meilleure protection restent donc un compromis, pas un vainqueur fabriqué.

## Oracle et construit

L’oracle compare la trace à l’état vrai, exige un examinateur distinct de l’auteur, vérifie la correction injectée dans le journal de transitions et teste la capacité après restitution. La présence de champs seule ne suffit pas.

## Contrôles

- factoriel complet : `True` ;
- budgets appariés : `True` ;
- contrat de l’oracle : `True` ;
- axes fonctionnels : `load=True`, `channel=True`, `registration=True`, `decision=True`, `environment=True`;
- reconstruction déterministe : `pipeline_verified`.

## Portée et retrait

Résultat des machines d’état : `model_internal`. Reconstruction : `pipeline_verified`. Revendications non soutenues : effet institutionnel et transport externe.

Condition de retrait : Withdraw the result if a generator axis is functionally inactive, paired worlds or action budgets differ, the oracle reads a mechanism label, reconstruction changes an artifact, or any O1-O4 field is missing.

Effet possible du protocole : The state machines, event rules, recovery horizon and oracle semantics fully determine the results; they are not calibrated to an institution.
