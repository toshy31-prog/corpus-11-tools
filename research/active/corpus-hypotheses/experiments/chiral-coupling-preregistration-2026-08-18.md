# Préenregistrement — couplage chiral dans les magmas d'ordre 3

Date de gel : 2026-08-18

Statut : **confirmatoire pré-calcul**. Ce document doit être lu comme la spécification gelée de l'expérience. Les résultats dynamiques ne doivent pas être inspectés avant fixation de toutes les définitions ci-dessous.

## Question

Parmi les magmas finis d'ordre 3 qui sont non isomorphes à leur opposé, existe-t-il une sous-population minoritaire et stable dont l'asymétrie structurelle devient dynamiquement accessible sous plusieurs protocoles neutres fixés à l'avance ?

La chaîne conceptuelle testée est :

`existence -> lisibilité -> couplage local -> transduction -> amplification`.

Le test ne porte pas sur une émergence physique du temps.

## Population

- Ensemble complet des `3^9 = 19 683` tables étiquetées d'ordre 3.
- Quotient exact par renommage des trois éléments pour obtenir les classes d'isomorphisme.
- Analyse confirmatoire principale restreinte aux classes non isomorphes à leur opposé.
- Les classes auto-opposées sont des contrôles négatifs de cohérence.

Aucun échantillonnage statistique de cette population n'est effectué ; les résultats d'ordre 3 sont des comptages exacts sur la population complète.

## Opposition et renommage

Pour une table `M`, l'opposé est défini par `a *_op b = b * a`.

Toute quantité scientifique utilisée doit être invariante sous renommage bijectif des éléments. Toute quantité signée chirale doit changer de signe sous `M -> M^op`.

## Phase A — structure, gelée avant dynamique

### Grammaire statique `O_static`

Aucun terme emboîté de profondeur supérieure à 1 n'est autorisé dans la phase statique. Les observables sont construits uniquement à partir des translations élémentaires de la table.

Pour chaque élément `a`, définir :

1. `L_image(a) = |{a*x : x in M}|` et `R_image(a) = |{x*a : x in M}|`.
2. `L_coll(a) = sum_y count_x[a*x=y]^2` et `R_coll(a) = sum_y count_x[x*a=y]^2`.
3. `L_fix(a) = |{x : a*x=x}|` et `R_fix(a) = |{x : x*a=x}|`.

Chaque famille est transformée en histogramme sur ses valeurs possibles. Les différences chirales statiques sont les distances `L1` entre histogrammes gauche et droit, normalisées par deux fois le nombre d'éléments afin d'être dans `[0,1]`.

On note `A_image`, `A_coll`, `A_fix` ces trois amplitudes.

### Profondeur statique de révélation

Les trois niveaux sont gelés dans l'ordre suivant :

- `d=1` : `A_image` ;
- `d=2` : ajout de `A_coll` ;
- `d=3` : ajout de `A_fix`.

`d_chi(M)` est le premier niveau auquel au moins une amplitude nouvellement admise est strictement non nulle. Si les trois niveaux sont nuls, `d_chi = inf` dans ce protocole. Cette valeur ne signifie pas absence de chiralité structurelle.

### Amplitude statique

`A_chi(M) = max(A_image, A_coll, A_fix)`.

### Covariables structurelles de contrôle

Elles sont fixées avant dynamique :

- nombre d'idempotents ;
- multiensemble trié des fréquences de sortie ;
- nombre exact de triplets associatifs parmi les 27 triplets ;
- nombre exact de paires commutatives parmi les 9 paires ordonnées ;
- taille du groupe d'automorphismes du magma ;
- multiensemble combiné trié des tailles d'images des translations gauche et droite.

Ces covariables sont invariantes sous opposition ou utilisées sous forme symétrisée.

## Phase B — protocoles dynamiques

La phase dynamique est volontairement distincte de `O_static`. Elle utilise des termes emboîtés ; aucune statistique de traduction gauche/droite de la phase A n'est utilisée comme observable dynamique.

### États et distributions initiales

Pour un arbre binaire plein `t` à `n` feuilles, l'état initial est un mot `(x_1,...,x_n)` tiré uniformément de `M^n`. Tous les `3^n` mots sont énumérés exactement ; aucune simulation Monte-Carlo n'est utilisée.

L'évaluation d'un arbre applique la multiplication du magma à chaque nœud interne.

### Involution d'opposition `J`

`J` renverse l'ordre des feuilles et remplace chaque arbre par son miroir gauche-droite. Sous cette transformation, l'évaluation dans `M^op` correspond exactement à l'évaluation de l'arbre miroir dans `M` après renversement des entrées.

### Famille gelée de protocoles `T`

Trois horizons sont utilisés : `n = 3, 4, 5` feuilles.

Pour chaque `n`, on considère **tous** les arbres binaires pleins ordonnés à `n` feuilles. Chaque arbre est apparié à son miroir. Les arbres auto-miroirs ont par construction une réponse chirale nulle et servent de contrôles internes.

Les ensembles d'arbres sont déterminés uniquement par `n`, avant examen des magmas.

### Observable dynamique `Q`

Pour chaque arbre `t` et magma `M`, soit `p_t^M(y)` la fréquence exacte de sortie `y` sur toutes les entrées uniformes de longueur `n`.

Définir l'indice de collision de sortie :

`S(t,M) = sum_y p_t^M(y)^2`.

Pour une paire miroir `(t, mirror(t))`, définir la réponse signée :

`K_t(M) = S(t,M) - S(mirror(t),M)`.

Cette quantité est invariante sous renommage et doit vérifier exactement `K_t(M^op) = -K_t(M)`.

### Profil de couplabilité protocolaire

Pour chaque horizon `n` :

`C_n(M) = max_t |K_t(M)|`, où le maximum porte sur les arbres à `n` feuilles gelés ci-dessus.

Le profil est `C_profile(M) = (C_3, C_4, C_5)`.

Ce profil est une capacité **relative à cette famille de protocoles**. Il ne sera pas appelé invariant intrinsèque.

### Couplage direct, retardé et amplification

- Couplage direct : `C_3 > 0`.
- Révélation retardée : `C_3 = 0` et `C_4 > 0` ou `C_5 > 0`.
- Profondeur dynamique de révélation : `h_chi = min{n in {3,4,5}: C_n > 0}`, sinon `inf`.
- Croissance exacte entre horizons : `G_34 = C_4 - C_3`, `G_45 = C_5 - C_4`.

Le mot **amplification** n'est autorisé que si `C_5 > C_3` et si l'augmentation n'est pas uniquement due à l'ajout d'un arbre qui reproduit algébriquement un observable de phase A. Toute interprétation d'échelle au-delà de `n=5` reste exploratoire.

## Seuil confirmatoire

Une classe est dite `strongly_couplable` si :

- elle est chirale structurellement (`M` non isomorphe à `M^op`) ;
- au moins deux des trois valeurs `C_3,C_4,C_5` sont supérieures ou égales à `1/27` ;
- les identités de renommage et d'opposition passent exactement.

Le seuil `1/27` est fixé avant résultat et correspond à une différence d'indice de collision de l'ordre d'une unité de probabilité sur les 27 entrées du premier horizon ; il est utilisé comme seuil opérationnel, pas comme constante physique.

## Hypothèse confirmatoire unique

**H1.** La transductivité protocolaire forte est minoritaire mais non nulle : parmi les classes chirales d'ordre 3, la proportion `p_strong` de classes `strongly_couplable` satisfait

`0.01 <= p_strong <= 0.25`.

De plus, au moins une paire de classes doit exister avec mêmes valeurs de `d_chi`, `A_chi` et covariables de contrôle déclarées, mais avec l'une `strongly_couplable` et l'autre non. Cette seconde condition teste que la lisibilité statique déclarée n'épuise pas la couplabilité protocolaire.

Les deux conditions sont nécessaires pour classer H1 comme satisfaite.

## Issues confirmatoires

- `supported` : les deux conditions de H1 sont satisfaites.
- `too_common` : `p_strong > 0.25` ; la classe spéciale n'est pas rare dans ce protocole.
- `too_rare_or_null` : `p_strong < 0.01` ; la chiralité structurelle ne fournit presque jamais ce canal sous ces protocoles.
- `static_exhausts_protocol` : la proportion est dans l'intervalle mais aucune paire statiquement appariée et dynamiquement séparée n'existe.

Aucune de ces issues n'établit une orientation temporelle physique.

## Contrôles obligatoires

1. Chaque classe auto-opposée doit avoir `C_3=C_4=C_5=0` à arithmétique exacte.
2. Renommer un magma doit conserver `A_chi`, `d_chi`, les covariables et `C_profile`.
3. Passer à l'opposé doit conserver les amplitudes absolues et inverser chaque `K_t`.
4. Les arbres auto-miroirs doivent avoir `K_t=0`.
5. Tous les calculs de probabilité utilisent des fractions rationnelles exactes.

Tout échec d'un de ces contrôles invalide l'expérience avant interprétation.

## Analyse principale

Comme l'ensemble des classes d'ordre 3 est entièrement énuméré, l'analyse principale est descriptive exacte :

- nombre de classes ;
- nombre de classes chirales ;
- distribution exacte de `d_chi`, `A_chi`, `C_3,C_4,C_5,h_chi` ;
- proportion `p_strong` ;
- recherche exhaustive de paires statiquement appariées mais séparées sur `strongly_couplable` ;
- table de contingence entre niveaux de lisibilité et couplabilité.

Aucune p-value classique n'est utilisée pour confirmer H1.

## Réplication hors population

Aucun résultat d'ordre 3 ne sera appelé général. Une réplication future devra utiliser une population indépendante : sous-famille d'ordre 4 définie sans regarder les sorties d'ordre 4, ou échantillon canonique gelé avant dynamique. Les seuils pourront être réévalués uniquement dans un nouveau préenregistrement, jamais rétroactivement pour l'ordre 3.

## Exploratoire explicitement séparé

Après classification confirmatoire seulement, il sera permis d'explorer :

- relations non monotones entre `A_chi` et `C_n` ;
- motifs structuraux associés aux queues du profil ;
- nouveaux horizons `n > 5` ;
- autres fonctionnelles de sortie que l'indice de collision ;
- autres familles de dynamiques neutres ;
- recherche d'une caractéristique stable du profil à travers familles de protocoles.

Ces analyses ne pourront pas reclasser H1.

## Condition de renversement scientifique

L'hypothèse générale « une chiralité compositionnelle fournit naturellement un substrat d'orientation » doit être affaiblie si plusieurs familles neutres indépendamment préenregistrées donnent soit une couplabilité quasi nulle, soit une couplabilité quasi universelle sans sous-structure discriminante stable. Un succès dans cette expérience ne démontre qu'une transduction algébrique protocolaire dans un modèle fini.
