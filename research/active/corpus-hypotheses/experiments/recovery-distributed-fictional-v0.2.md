# Récupération distribuée fictive — protocole v0.2

Statut auto-déclaré dans la configuration : **protocole fixé avant exécution**,
sans verrou temporel indépendant. Portées : `formal_exact` pour l'identité dans
le générateur fini et `pipeline_verified` pour sa reconstruction.

## Correction de qualification

La v0.1 reste conservée, mais sa qualification d'« oracle indépendant » était
fausse : simulateur, recherche exhaustive et signature causale dérivent tous du
même générateur déclaré. `C_info=1` était posé par construction et non mesuré;
cet axe est retiré. La v0.2 ne revendique qu'un théorème endogène : dans cet
univers fini, le coût minimal de reset énuméré est une fonction exacte de la
signature causale déclarée.

## Univers et énumération

Les paramètres restent quatre réplicas, versions `A/B/AB`, quatre enveloppes,
quatre profils, quatre partitions, deux cibles de crash, deux modes de crash et
les `120` permutations de quatre livraisons et d'un crash. Les `7680` cellules
sont énumérées. Pour chacune, les `16` ensembles de reset sont exécutés dans la
même machine de transition. Ce calcul est une énumération de référence interne,
pas une source d'évidence indépendante.

## Ablations imbriquées

`graph_only`, `schedule_artifact` et `causal_frontier` n'ont pas des budgets
appariés. Ce sont trois ablations à budgets d'information strictement imbriqués :
topologie; puis topologie+horaire+crash; puis ces champs+ascendance d'horloge.
Leur classement indique la variable omise nécessaire dans ce générateur, pas
la supériorité équitable d'une méthode.

## Quotient et contrôles

Les cellules unitaires sont quotientées par signature conditionnelle exacte.
Les champs de condition sont `profile`, `partition`, `crash_replica` et
`crash_mode`. Les autres champs de clé sont ensembles de reset minimaux,
prédictions des trois ablations, coûts de coupure, réplicas sales sans reset et
statuts d'événements. La liste ordonnée complète est fixée dans
`quotient_key_fields`; le runner refuse toute divergence. L'artefact consigne
chaque signature, sa multiplicité et un représentant; la validation recalcule
le quotient depuis les `7680` cellules et exige l'égalité exacte, pas seulement
la somme des multiplicités. Les contrôles conservent non-vacuité, ascendance
`A/AB`, contrôle `B`, ordre, crash durable/volatile, positions de coupure et
ensembles robustes.

## Verdict, portée et retrait

Le verdict `endogenous_causal_signature_identity` exige zéro mismatch entre
l'énumération de transition et la signature causale, y compris sur les
ensembles robustes. Tout mismatch retire le théorème. Les revendications non
soutenues sont : oracle indépendant, coût de récupération d'information mesuré,
équivalence externe et mémoire physique ou subjective. Aucun agrandissement de
la même famille n'est prioritaire après identité exacte.
