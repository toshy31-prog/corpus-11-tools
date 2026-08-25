# CCT-SC-D10-003 — protocole sémantique fictif O1–O4

Statut auto-déclaré dans la configuration : **protocole fixé avant exécution**,
sans verrou temporel indépendant. Portée : `model_internal`, avec reconstruction
`pipeline_verified`.

## Raison de la nouvelle version

L'audit de `CCT-SC-D10-002` a montré trois insuffisances : la distinction entre
auteur et examinateur ne vérifiait pas l'autorité de l'acteur, le contenu du
journal O4 n'était pas reconstruit, et le budget déclaré n'était pas consommé.
Le résultat v0.2 reste conservé mais ne soutient plus ces trois revendications.
La v0.3 fixe ces règles avant sa propre exécution.

## Générateur et observations

Les 32 mondes restent le produit exhaustif de cinq axes binaires. Quatre
variations exercent coût d'observation, horizon de restitution et un budget
apparié réduit. O1 conserve les cinq portes séparées; O2 conserve les trois
charges, délais et abandons; O3 vérifie trace, acteur attendu, autorité déclarée
et changement d'état; O4 reconstruit la file depuis le journal de récupération,
la capacité appliquée, l'horizon, le seuil, les pertes et la sonde d'usage.

## Budget actif et appariement

Chaque mécanisme reçoit huit unités dans les trois variations ordinaires et
quatre dans `matched_low_action_budget`. Décision, tentative de trace, défi,
revue, correction ou maintien, récupération et sonde d'usage coûtent chacun une
unité. Le ledger enregistre seulement les actions exécutées; une action refusée
faute de budget est enregistrée séparément avec son rang de tentative. Aucune
transition ne peut modifier l'état sans dépense. Le checker recalcule ordre,
coût utilisé, solde et refus, et exige que le budget effectif ne dépasse ni son
plafond ni la valeur autorisée par la variation.

## Autorités O3 et contenu O4

L'état vrai porte une carte d'autorité. `routing_role` seul décide,
`recourse_role` seul revoit puis corrige ou maintient, le demandeur défie et
`recovery_role` restaure. Un acteur simplement différent de l'auteur ne suffit
pas. Le journal O4 doit reconstruire exactement file initiale, capacité,
bonus d'horizon, pénalité topologique, file finale, seuil, réactivation et
pertes. Les mutations d'acteur, d'autorité, de file et de dépense sont des
contrôles négatifs obligatoires. La capacité appliquée doit être exactement la
capacité autorisée par le contrat du mécanisme quand la récupération est
exécutée, et zéro sinon.

## Rival, verdict et retrait

Le rival append-only conserve trace et recours propres. Les comparaisons restent
vectorielles, sans score global. Verdicts : `d10_advantage`,
`baseline_advantage`, `compatible_survivors`, `protocol_invalid`.

Retirer le résultat si les budgets effectifs diffèrent dans une paire, si une
action non financée modifie l'état, si O3 accepte un acteur sans autorité, si O4
accepte un journal faux, si un axe est inactif ou si la reconstruction change.
Le protocole ne représente aucune institution réelle.
