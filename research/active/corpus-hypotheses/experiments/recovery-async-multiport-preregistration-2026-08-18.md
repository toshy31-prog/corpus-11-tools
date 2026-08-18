# Préenregistrement — récupération / désinscription asynchrone multi-port

Date de gel : 2026-08-18

Statut : **réplication prospective pré-calcul sur une famille n=6 non ouverte**.

## Provenance exploratoire

Un petit cas de conception `n=5` a été inspecté avant ce préenregistrement pour vérifier que le mécanisme asynchrone n'était pas vide. Aucun résultat `n=5` ne sera utilisé comme confirmation. La population confirmatoire ci-dessous est distincte et n'a pas été inspectée avant gel.

## Question

À récupération égale et coût d'effacement asymptotique égal, un budget d'effacement sous une seule passe asynchrone adversariale peut-il distinguer des architectures appariées sur des contrôles structurels de bas ordre ?

Le test ne cherche pas une nouvelle loi physique. Il teste si l'axe **temps d'intervention / nombre de ports de reset** apporte une coordonnée opérationnelle distincte du seul coût d'effacement à convergence.

## Population gelée

Six nœuds `V={0,1,2,3,4,5}`.

- `0` est le port source de l'événement.
- Aucune arête n'entre dans `0`.
- Les arêtes source `0 -> j`, `j=1..5`, sont libres.
- Entre nœuds internes, seules les arêtes orientées `i -> j` avec `1 <= i < j <= 5` sont autorisées.

La famille brute contient donc `2^(5 + C(5,2)) = 2^15 = 32768` graphes dirigés.

L'analyse conserve uniquement les graphes où tous les nœuds sont atteignables depuis `0` avant intervention.

La restriction `i<j` rend le sous-graphe interne acyclique par construction. Elle est fixée avant résultat et constitue une famille de réplication différente du cas exploratoire `n=5`.

## Enregistrement et récupération

L'événement binaire `b=1` est supposé avoir été diffusé avant l'intervention, de sorte que l'état initial d'effacement est `x_v=1` pour les six nœuds.

Une lecture terminale de n'importe quel nœud donne donc `b` exactement. Pour toute architecture admise :

`C_info = 1`.

Ce coût est une convention opérationnelle du jouet, pas une mesure physique d'information.

## Ports de reset et dynamique

Une intervention choisit un ensemble `S` de nœuds maintenus (« clampés ») à `0` pendant l'effacement.

- Si `0` n'est pas clampé, il conserve `x_0=1`.
- Chaque nœud interne non clampé, lorsqu'il est activé, effectue

`x_v <- OR_{u -> v} x_u`,

avec `OR(empty)=0`.

Les mises à jour sont asynchrones.

## Deux budgets d'effacement

### Effacement à convergence `C_erase_inf`

`C_erase_inf` est le nombre minimal de ports clampés garantissant l'état tout-zéro après mises à jour asynchrones répétées sous toute ordonnance équitable.

Dans cette famille interne acyclique, la prédiction structurelle gelée est :

`C_erase_inf = 1`,

car clamper la source puis laisser relaxer le DAG suffit.

### Effacement en une passe `C_erase_1`

Après clampage, chaque nœud interne non clampé est activé **exactement une fois**. L'ordre est choisi adversarialement parmi toutes les permutations possibles.

`C_erase_1` est le nombre minimal de ports clampés garantissant l'état tout-zéro à la fin de la passe pour **tout** ordre de mise à jour.

Prédiction structurelle gelée :

`C_erase_1 = 1 + tau(G_int)`,

où `tau(G_int)` est la taille d'une couverture minimale de sommets du graphe non orienté obtenu en oubliant l'orientation des arêtes internes.

Cette identité sera vérifiée exhaustivement par le programme et interprétée comme absorption par un invariant standard, non comme nouveauté.

## Contrôles d'appariement

Pour chaque architecture, la clé statique gelée est :

1. degré sortant de la source ;
2. nombre d'arêtes internes ;
3. multiensemble des degrés entrants internes ;
4. multiensemble des degrés sortants internes ;
5. multiensemble des distances depuis la source ;
6. multiensemble des tailles de composantes fortement connexes ;
7. nombres de cycles dirigés simples de longueurs 2, 3 et 4 ;
8. `C_erase_inf`.

Dans la famille DAG, les SCC et cycles sont des contrôles nuls mais restent déclarés pour rendre la comparaison explicite avec les familles précédentes.

## H1 confirmatoire

Il existe au moins une clé statique réalisée par deux architectures ayant :

- `C_info` identique (=1) ;
- `C_erase_inf` identique (=1) ;
- tous les contrôles ci-dessus identiques ;
- mais `C_erase_1` différent.

## Issues

- `replicated_profile_separation` : au moins une strate appariée présente plusieurs valeurs de `C_erase_1` ;
- `no_matched_separation` : aucune strate appariée ne sépare `C_erase_1`.

Si `replicated_profile_separation` est obtenu **et** `C_erase_1 = 1 + tau` pour toutes les architectures, la conclusion scientifique sera explicitement : `standard_profile_separation` — axe opérationnel distinct, mais entièrement réductible ici à la couverture minimale de sommets.

## Contrôles obligatoires

1. exactement `32768` graphes bruts sont énumérés ;
2. tous les graphes retenus sont atteignables depuis la source ;
3. le sous-graphe interne est acyclique ;
4. `C_info=1` pour tous ;
5. `C_erase_inf=1` pour tous ;
6. `C_erase_1` est calculé par recherche exhaustive des ensembles de reset et de tous les ordres asynchrones pertinents ;
7. l'identité à la couverture minimale de sommets est auditée sur toute la population retenue ;
8. aucune simulation Monte-Carlo.

## Interprétation gelée

Un succès n'établira pas une nouvelle mesure fondamentale de désinscription. Il montrera seulement que deux régimes d'intervention — convergence illimitée et une passe asynchrone adversariale — exigent des ressources différentes et que cette différence peut survivre à des contrôles structurels de bas ordre.

L'identité avec la couverture de sommets, si elle passe, constituera en même temps une explication standard du coût une-passe.

Un échec d'H1 indiquera que cette famille n'ajoute aucun pouvoir discriminant au-delà des contrôles gelés.

## Prochaine étape conditionnelle

Ne passer au matériel qu'après ce test fini. Si le profil se réplique mais reste standard, le protocole matériel devra mesurer non la « nouveauté » du scalaire, mais la robustesse de la séparation `C_info / C_erase_inf / C_erase_1` sous latences, pertes et ports réels définis avant acquisition.
