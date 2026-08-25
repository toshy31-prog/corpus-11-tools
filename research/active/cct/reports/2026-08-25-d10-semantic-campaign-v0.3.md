# D10 — correction sémantique O1–O4 v0.3

## Motif

La revue croisée a trouvé trois défauts dans `CCT-SC-D10-002` : O3 ne
distinguait pas acteur différent et acteur autorisé, O4 ne lisait pas le contenu
du journal de récupération, et `action_budget` n'influençait aucune transition.
L'artefact v0.2 est conservé mais ces revendications sont retirées.

## Exécution corrigée

`CCT-SC-D10-003` porte une déclaration de configuration « fixé avant
exécution », sans verrou temporel indépendant. Il conserve les 32 mondes et
ajoute une quatrième variation à budget effectif réduit et apparié.
Le ledger consomme chaque décision, trace, défi, revue, correction,
récupération et sonde. O3 exige les acteurs exacts de la carte d'autorité. O4
reconstruit file initiale, capacité, bonus d'horizon, pénalité, file finale,
seuil, sonde, réactivation et pertes.

Contrôles : 128 paires, cinq axes fonctionnels, budget actif et apparié, zéro
violation du contrat. Les plafonds autorisés de budget et de capacité sont lus
par le checker sans nom de mécanisme. Les mutations d'un examinateur distinct
mais non autorisé, d'une file O4 fausse, d'un budget supérieur au plafond,
d'une capacité arbitraire et d'un faux refus d'action sont rejetées.

## Résultat et portée

Verdict `compatible_survivors` : 70 avantages D10 et 2 avantages du rival sur
le vecteur de protection; 0 dominance de Pareto et 128 compromis. La variation
de budget révèle donc un cas où le rival protège davantage, sans créer de score
global.

Portées : `model_internal` pour les machines d'état et `pipeline_verified` pour
la reconstruction. `unsupported_claims` : effet institutionnel et transport
externe. Retirer le résultat si un budget effectif diffère dans une paire, si
une action non financée modifie l'état, si O3 accepte un acteur sans autorité ou
si O4 accepte un journal faux.
