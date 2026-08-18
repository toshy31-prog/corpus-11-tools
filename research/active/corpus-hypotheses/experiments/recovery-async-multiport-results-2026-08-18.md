# Résultats — récupération / désinscription asynchrone multi-port

Date : 2026-08-18

Préenregistrement : `recovery-async-multiport-preregistration-2026-08-18.md`

Script : `run_recovery_async_multiport_n6.py`

## Population et contrôles

PASS exact :

- `32768` architectures brutes énumérées ;
- `9765` architectures où les six nœuds sont atteignables depuis la source ;
- tous les sous-graphes internes sont des DAGs par construction ;
- `C_info=1` pour toute la population ;
- `C_erase_inf=1` pour toute la population ;
- pour chaque ensemble de reset candidat, les `120` ordres possibles d'une passe asynchrone sur les cinq nœuds internes sont contrôlés exactement ;
- zéro simulation Monte-Carlo ;
- zéro violation de l'identité `C_erase_1 = 1 + tau(G_int)` où `tau` est la couverture minimale de sommets du graphe interne non orienté.

## Résultat confirmatoire

Les `9765` architectures se répartissent en `685` strates selon la clé de contrôle gelée.

**176 strates** contiennent au moins deux valeurs distinctes de `C_erase_1` alors que sont exactement identiques :

- `C_info=1` ;
- `C_erase_inf=1` ;
- degré sortant de la source ;
- nombre d'arêtes internes ;
- multiensembles des degrés entrants/sortants internes ;
- multiensemble des distances à la source ;
- profil SCC ;
- cycles dirigés simples de longueurs 2/3/4 ;
- famille dynamique et classe d'interventions.

Décision H1 : **`replicated_profile_separation`**.

Classification scientifique bornée : **`standard_profile_separation`**.

## Distribution exacte de `C_erase_1`

- `1` : 1 architecture ;
- `2` : 276 architectures ;
- `3` : 4824 architectures ;
- `4` : 4648 architectures ;
- `5` : 16 architectures.

## Exemple apparié canonique

Clé commune :

- degré source : `4` ;
- arêtes internes : `2` ;
- degrés entrants internes : `(0,0,0,1,1)` ;
- degrés sortants internes : `(0,0,0,1,1)` ;
- distances source : `(1,1,1,1,2)` ;
- SCC : `(1,1,1,1,1)` ;
- cycles `2/3/4` : `(0,0,0)` ;
- `C_erase_inf=1`.

Architecture A :

`(0,1),(0,2),(0,4),(0,5),(1,2),(2,3)`

- `C_info=1` ;
- `C_erase_inf=1` ;
- `C_erase_1=2`.

Architecture B :

`(0,1),(0,2),(0,3),(0,5),(1,4),(2,3)`

- `C_info=1` ;
- `C_erase_inf=1` ;
- `C_erase_1=3`.

La différence une-passe est exactement la différence de couverture minimale de sommets du graphe interne : `tau=1` contre `tau=2`.

## Lecture mécaniste

Le résultat distingue deux régimes d'intervention qui avaient été fusionnés dans les tests antérieurs :

- à temps de relaxation illimité, clamper seulement la source suffit dans tout DAG interne ;
- en une seule passe asynchrone adversariale, il faut également clamper un ensemble couvrant toutes les arêtes internes, sinon un nœud peut être mis à jour avant un prédécesseur encore à `1` et conserver une trace en fin de passe.

Ainsi le **profil** `(C_info,C_erase_inf,C_erase_1)` porte davantage d'information opérationnelle que le seul coût à convergence.

## Ce que le résultat ne montre pas

Il ne montre pas :

- une nouvelle quantité fondamentale ;
- une mesure irréductible de mémoire ;
- une loi physique ;
- une irréversibilité thermodynamique ;
- que la couverture de sommets soit une mesure privilégiée hors de ce protocole.

Au contraire, le coût une-passe est ici **entièrement absorbé par un invariant standard**.

## Conséquence scientifique

L'hypothèse « récupération et désinscription peuvent exiger des ressources différentes selon la classe d'interventions » est renforcée au niveau opérationnel : le délai d'intervention/asynchronie ajoute une coordonnée reproductible du profil.

La prétention plus forte selon laquelle cette coordonnée introduirait une nouvelle mesure non standard n'est pas soutenue dans ce jouet.

## Prochaine étape

Le prochain test utile n'est pas d'agrandir encore le catalogue combinatoire. Il faut transporter le triplet opérationnel vers un système avec latences ou ordres de mise à jour effectivement mesurés : petit réseau matériel, microcontrôleurs, processus/queues asynchrones, ou émulation réseau avec paramètres gelés avant acquisition.

Le protocole matériel doit mesurer séparément :

`C_info`, coût de reset à convergence, coût sous deadline/passe bornée, latence, nombre de ports effectivement contrôlés et taux de traces résiduelles.
