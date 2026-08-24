# Intersections d'espaces fixes dans l'action naturelle de B3

## Statut du document

Note mathématique assistée par ordinateur. Elle reformule le résultat H5 sans
vocabulaire objectal ou physique. Le lemme structurel est démontré directement ;
les dénombrements finis sont certifiés par une classification sous conjugaison et
un script indépendant.

## Résumé

Soit `B3` le groupe des 48 matrices de permutation signées agissant sur `Q^3`.
Pour une famille `S` de matrices, posons

`d(S) = dim(intersection_{M in S} Fix(M))`.

Les contraintes de point fixe de `S` définissent un multigraphe signé sur trois
sommets. Nous montrons que `d(S)` est exactement le nombre de composantes
connexes équilibrées de ce graphe. Cette traduction explique pourquoi les
dimensions marginales et deux-à-deux ne déterminent pas toujours l'intersection
triple.

Une classification exhaustive des triplets non ordonnés montre ensuite que 84
des `C(48,3)=17 296` triplets ont la clé basse

`((2,2,2),(1,1,1))`.

Ils se répartissent en dix orbites de conjugaison simultanée : 68 ont une
intersection triple nulle et 16 une intersection triple de dimension un. Le test
à quatre matrices porte sur les 3 780 extensions possibles. Sous la clé de
contrôle préenregistrée, deux des cinq strates appariées ont un contraste positif
et la médiane des contrastes est nulle. Le résultat H5 `not_supported` est ainsi
un énoncé combinatoire fini, non une conclusion sur la persistance d'objets.

## 1. Conventions

Une matrice `M` est représentée par une permutation `sigma` de `{1,2,3}` et des
signes `epsilon_j` tels que

`M e_j = epsilon_j e_{sigma(j)}`.

Sa fenêtre signée est

`[epsilon_1 sigma(1), epsilon_2 sigma(2), epsilon_3 sigma(3)]`.

Pour une famille finie `S`, le graphe signé `Gamma(S)` a les sommets `{1,2,3}`
et, pour chaque `M` et chaque `j`, une arête de `j` à `sigma(j)` portant le signe
`epsilon_j`. Les boucles et arêtes multiples sont conservées.

Une composante est dite équilibrée lorsque le produit des signes le long de tout
cycle fermé est positif.

## 2. Lemme structurel

**Lemme.** Sur tout corps de caractéristique différente de deux,

`d(S) = nombre de composantes connexes équilibrées de Gamma(S)`.

**Preuve.** L'équation `Mx=x` équivaut, pour chaque colonne `j`, à

`x_{sigma(j)} = epsilon_j x_j`.

Dans une composante connexe, choisir la valeur d'une coordonnée détermine toutes
les autres par propagation le long des arêtes. Si tous les cycles ont un produit
positif, la valeur propagée ne dépend pas du chemin et la composante fournit un
paramètre libre. Si un cycle a un produit négatif, la propagation impose
`x_j=-x_j`, donc `x_j=0`; la connexité force alors toutes les coordonnées de la
composante à être nulles. Les composantes étant indépendantes, la dimension de
l'espace des solutions est le nombre de composantes équilibrées. `□`

Ce lemme est une reformulation élémentaire de la géométrie des espaces fixes des
groupes de réflexion de type B. Il n'est pas revendiqué comme nouveau.

## 3. Proposition finie assistée par ordinateur

**Proposition.** Dans l'action naturelle de `B3` sur `Q^3` :

1. exactement 84 triplets non ordonnés ont les dimensions fixes marginales
   `(2,2,2)` et deux-à-deux `(1,1,1)` ;
2. ces triplets forment dix orbites sous conjugaison simultanée ;
3. 68 triplets ont `d(S)=0` et 16 ont `d(S)=1`.

La table suivante donne une fenêtre signée représentante pour chaque orbite.

| Représentant | Taille | d(S) |
|---|---:|---:|
| `[-1,2,3] [1,-2,3] [1,2,-3]` | 1 | 0 |
| `[-1,2,3] [1,-2,3] [1,-3,-2]` | 12 | 0 |
| `[-1,2,3] [1,-2,3] [-2,-1,3]` | 6 | 1 |
| `[-1,2,3] [1,-3,-2] [1,3,2]` | 3 | 0 |
| `[-1,2,3] [1,-3,-2] [-2,-1,3]` | 24 | 0 |
| `[-1,2,3] [-2,-1,3] [2,1,3]` | 6 | 1 |
| `[-1,2,3] [-2,-1,3] [-3,2,-1]` | 12 | 0 |
| `[1,-3,-2] [1,3,2] [-2,-1,3]` | 12 | 0 |
| `[1,-3,-2] [-2,-1,3] [-3,2,-1]` | 4 | 0 |
| `[1,-3,-2] [-2,-1,3] [3,2,1]` | 4 | 1 |

Les tailles d'orbites donnent

`1+12+6+3+24+6+12+12+4+4 = 84`.

Les trois orbites à dimension un ont les tailles `6+6+4=16`; les sept autres
ont une taille totale de 68.

## 4. Extensions à une quatrième matrice

Chaque triplet qualifiant reçoit chacune des 45 matrices absentes, soit
`84*45=3 780` extensions. Le certificat trouve 219 orbites d'extensions. La clé
de contrôle est

`G(T,D)=(d({D}), multiset(d({A,D}),d({B,D}),d({C,D})))`.

Les cinq strates contenant des triplets à `d(T)=0` et `d(T)=1` sont :

| G | cellules exactes `(d3,d4,identité): effectif` |
|---|---|
| `(0,(0,0,0))` | `(0,0,non):1020`; `(1,0,non):240` |
| `(1,(0,0,0))` | `(0,0,non):388`; `(1,0,non):72` |
| `(1,(1,0,0))` | `(0,0,non):720`; `(1,0,non):252` |
| `(2,(1,1,1))` | `(0,0,non):408`; `(1,0,non):84`; `(1,1,non):12` |
| `(3,(2,2,2))` | `(0,0,oui):68`; `(1,1,oui):16` |

Les contrastes de moyenne `d4` sont donc

`0, 0, 0, 1/8, 1`.

Deux strates sur cinq sont positives et leur médiane est `0`. La classification
préenregistrée H5 est par conséquent `not_supported`.

## 5. Nature de la preuve

Le lemme signé est une preuve mathématique directe. La proposition numérique est
une preuve assistée par ordinateur reposant sur une population finie complète.
Le script indépendant :

- reconstruit les 48 matrices sans donnée externe ;
- compare le lemme signé au rang rationnel sur 4 662 sous-ensembles distincts ;
- calcule les orbites par les 48 conjugaisons ;
- vérifie que les orbites couvrent exactement les 84 triplets ;
- recalcule les 3 780 extensions et les cinq strates.

Commande de reproduction :

```text
python3 research/active/corpus-hypotheses/experiments/analyze_b3_fixed_space_orbits.py
```

Le flux JSON déterministe produit lors de cette vérification a le SHA-256
`dab9d6dc6675bee415f4ae2efa769010624d26c7168500c1a3a4595c3c537885`.

## 6. Portée et nouveauté

Le groupe hyperoctaédral, les arrangements de réflexion de type B et leurs
espaces fixes sont classiques. La recherche bibliographique initiale n'a pas
retrouvé les nombres exacts `84`, `68/16`, les cinq strates ci-dessus ou le test
H5. Cette absence dans une recherche indexée ne démontre pas l'inédit.

La contribution défendable est donc étroite : une petite classification
computer-assisted dans `B3`, accompagnée d'un lemme explicatif. Elle ne soutient
ni objet physique, ni dynamique, ni temps émergent.

Avant toute soumission extérieure, il faudrait :

1. faire vérifier indépendamment le script et les conventions de matrices ;
2. compléter la bibliographie spécialisée sur les treillis d'intersection de
   type B, les sous-groupes paraboliques et les graphes signés ;
3. remplacer si possible les comptes d'extensions par une dérivation manuelle
   à partir des dix orbites ;
4. demander à un spécialiste si cette classification est suffisamment non
   triviale pour une note, un exemple pédagogique ou seulement une annexe.

## Références de cadrage

- Marcelo Aguiar et Swapneel Mahajan, *Topics in Hyperplane Arrangements*, AMS,
  chapitres 5–6.
- Theo Douvropoulos, « Counting nearest faraway flats for Coxeter chambers »,
  *Journal of Combinatorial Algebra* 8 (2024), 121–146,
  DOI `10.4171/JCA/80`.
- Michael Field, *Dynamics and Symmetry*, section 4.5 sur la famille
  hyperoctaédrale.

## Artifacts locaux

- Préenregistrement H5 :
  `experiments/factorization-signed-fourth-extension-preregistration-2026-08-23.md`.
- Résultat H5 :
  `experiments/factorization-signed-fourth-extension-results-2026-08-24.md`.
- Script de certification par orbites :
  `experiments/analyze_b3_fixed_space_orbits.py`.
