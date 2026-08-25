# Gouvernance d’un écosystème contributeur fictif

Le laboratoire exerce un automate de proposition, revue, contestation,
amendement, résolution, acceptation, appel et retrait. Les droits sont attachés
aux transitions, pas seulement à des libellés d’acteurs.

`python3 tests/test_governance_state_machine.py` accepte un cycle complet et les
six positions déclarées du veto, puis rejette 42/42 substitutions de rôle. Le
veto est testé comme clôture distincte, pas comme preuve d'un recours. L’ancienne
fixture sans temps ne satisfaisait pas son propre invariant. Portée
`formal_exact` sur l’automate.
