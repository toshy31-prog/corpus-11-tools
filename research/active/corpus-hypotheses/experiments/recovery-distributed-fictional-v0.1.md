# Récupération distribuée fictive à quatre réplicas — protocole v0.1

Statut auto-déclaré dans la configuration : **protocole fixé avant exécution**,
sans verrou temporel indépendant. La configuration exécutable associée est
`recovery-distributed-fictional-v0.1.json`.

## Question discriminante

Dans un univers fini distribué comprenant versions indépendantes, horloges
vectorielles, partitions, crash, récupération et messages en vol, le coût
minimal de désinscription sous deadline laisse-t-il un résidu après comparaison
avec trois modèles rivaux fixés : `graph_only`, `schedule_artifact` et
`causal_frontier` ?

Le test ne cherche ni une nouvelle physique ni une équivalence externe. Il
cherche le plus petit substitut interne distinct du banc logiciel local déjà
clos qui puisse faire échouer l'absorption par un invariant standard.

## Univers exact

Quatre réplicas `R={0,1,2,3}` sont utilisés. L'événement cible `A` et le
contrôle indépendant `B` ont les horloges respectives `(1,0,0,0)` et
`(0,1,0,0)`. Leur descendant joint `AB` a l'horloge `(1,1,0,0)`. Une trace de
`A` signifie uniquement que la première composante de l'horloge est positive.
Ce proxy mesure une ascendance causale déclarée; il ne mesure ni mémoire
subjective, ni information physique, ni continuité.

Quatre enveloppes immuables existent dans un buffer réseau indépendant du
reset de l'émetteur : `0->2`, `1->2`, `0->3`, `1->3`. Les quatre profils de
charge fixés sont `a_r2`, `a_r3`, `a_both` et `ab_both`. Les quatre partitions
sont `none`, `isolate_r2`, `isolate_r3` et `diagonal`. Un crash touche `2` ou
`3`, selon deux variantes :

- `durable_recovery` conserve l'état antérieur au crash puis le restaure à la
  deadline ;
- `volatile_loss` perd cet état et rejette les livraisons postérieures au
  crash.

Chaque monde exécute exactement une permutation des quatre tentatives de
livraison et du crash. Les `5! = 120` permutations sont énumérées, sans tirage.
L'intervention a lieu après le troisième événement. Les positions `2` et `4`
sont des contrôles de méthode : sous un reset maintenu jusqu'à la deadline, le
résultat doit rester identique à horaire complet fixé.

Population principale fixée :

`4 profils × 4 partitions × 2 réplicas crashés × 2 modes × 120 horaires = 7680 mondes`.

## Transition et énumération de référence

Le simulateur concret applique la partition, les livraisons, la jointure
composante par composante des horloges, le crash, l'image de récupération et le
reset. L'intervention efface les réplicas choisis et les maintient à zéro
jusqu'à la deadline. Pour chaque monde, l'énumération essaie exactement les `16`
sous-ensembles de réplicas, par cardinalité croissante, et retient tous les
ensembles minimaux rendant la trace cible absente.

`C_info=1` est posé par construction, et non mesuré; la v0.2 retire donc cet
axe. `C_erase_deadline` est le cardinal minimal trouvé par l'énumération. Le
calcul n'utilise ni Monte-Carlo ni arrondi.

## Modèles rivaux

- `graph_only` utilise la source cible et les destinations encore reliées par
  au moins une enveloppe non partitionnée. Il ignore horloges, ordre et crash.
- `schedule_artifact` ajoute ordre et sémantique du crash au graphe, mais traite
  toutes les enveloppes comme si elles portaient la cible. Il ne lit aucune
  horloge.
- `causal_frontier` utilise uniquement la source cible et les destinations
  atteignables par une enveloppe dont l'horloge descend de `A`, en tenant compte
  de la partition et de la position du crash. Son calcul symbolique est séparé
  du simulateur concret, mais les deux dérivent du même générateur déclaré.

Ces modèles ont des budgets d'information imbriqués, non appariés. La v0.1 ne
fournit donc ni oracle indépendant ni comparaison équitable de méthodes; la
v0.2 conserve les calculs et corrige explicitement cette qualification.

Les modèles sont comparés par exactitude monde par monde, erreur absolue,
sur/sous-estimation et collisions : une clé rivale est insuffisante si deux
mondes partageant cette clé ont des coûts oracle différents.

## Contrôles de non-vacuité et effet de méthode

Le protocole est invalide si l'un des contrôles suivants échoue :

1. exactement `7680` mondes distincts et `120` horaires par scénario ;
2. au moins deux valeurs de `C_erase_deadline` ;
3. au moins une paire appariée où changer seulement les horloges change le
   coût ;
4. au moins un scénario où changer seulement l'ordre change le coût ;
5. au moins une paire où le mode durable/volatile change le coût ;
6. invariance exacte entre `a_both` et `ab_both`, car `AB` conserve
   l'ascendance de `A` ;
7. aucune création de trace cible par une enveloppe `B` ;
8. reconstruction déterministe et identité des résultats aux positions de
   coupure `2`, `3` et `4` sous le clamp déclaré.

Le buffer indépendant est un effet de protocole possible : un reset qui
annulerait aussi les enveloppes en vol définirait un autre modèle. De même, le
mode de crash peut changer les coûts absolus. La conclusion ne survivra que si
le classement des modèles reste valide dans les deux modes déclarés.

## Verdicts fixés

1. `protocol_invalid` si un contrôle obligatoire échoue ;
2. `residual_nonstandard` si `causal_frontier` diffère de l'oracle alors que les
   contrôles passent ;
3. `graph_only` si la clé topologique suffit exactement dans tout l'univers ;
4. `schedule_artifact` si l'ordre et le crash sans horloge suffisent exactement ;
5. `causal_frontier_absorption` si le modèle causal est exact partout tandis
   que les rivaux sans horloge ont des collisions ou des erreurs.

## Portée, retrait et arrêt

Portées maximales : `formal_exact`, `model_internal`, `pipeline_verified`.
Les données sont entièrement fictives. Le générateur, ses paramètres, les
invariants, les contrôles, les effets possibles du protocole et les mondes
unitaires seront consignés dans l'artefact JSON.

La conclusion d'absorption doit être retirée au premier mismatch oracle du
modèle `causal_frontier` après passage des contrôles. Un outcome constant rend
le protocole invalide. Si l'absorption est exacte, agrandir ce même univers
local n'est pas une prochaine action : la meilleure conclusion atteignable est
alors que la séparation reste un profil opérationnel compilable en frontière
causale standard dans ce substitut.
