# Résultats — décomposition statique des réponses chirales P1/P2

Date d'exécution : 2026-08-18

Préenregistrement : `chiral-static-decomposition-preregistration-2026-08-18.md`

Script : `run_chiral_static_decomposition_order3.py`

## Portée

Audit exact sur les `3 192` classes chirales d'ordre 3. Les profils P1 et P2 sont reproduits à partir de leurs définitions versionnées ; aucun protocole dynamique nouveau n'est introduit.

L'objectif est uniquement de tester si les profils dynamiques déjà observés sont déterminés par une hiérarchie statique gelée d'invariants algébriques standards.

## Contrôles

Les contrôles passent exactement :

- `3 330` classes d'isomorphisme retrouvées ;
- `3 192` classes chirales analysées ;
- invariance de `I0..I4`, `Y1` et `Y2` sous passage à l'opposé ;
- invariance de `I0..I4`, `Y1` et `Y2` sous le renommage de contrôle `0 <-> 1` ;
- arithmétique rationnelle exacte pour P1/P2 ;
- partitions exactes, sans clustering ni apprentissage.

## Résultat confirmatoire

Classification préenregistrée :

**`standard_absorption`**.

Les deux profils dynamiques deviennent entièrement déterminés par le descripteur cumulatif au niveau `I3`, c'est-à-dire après ajout de la signature statique de l'associateur aux contrôles historiques, types de translations et signatures de semigroupes de translations.

Aucun recours au niveau riche `I4` des tables de petits termes n'est nécessaire pour déterminer P1 ou P2.

## Raffinement exact des partitions

Chaque ligne donne :

`R_k` = cellules statiquement identiques mais dynamiquement séparées ;
`N_k` = classes contenues dans ces cellules ;
`M_k` = taille maximale d'une cellule résiduelle ;
`B_k` = nombre total de cellules statiques au niveau cumulatif.

### Niveau I0 — contrôles historiques

- P1 : `R=156`, `N=716`, `M=14`, `B=1373`.
- P2 : `R=148`, `N=678`, `M=14`, `B=1373`.
- profil conjoint `(P1,P2)` : `R=167`, `N=762`, `M=14`, `B=1373`.
- cellules séparées simultanément sur P1 et P2 : `137`.

Les six covariables historiques, `d_chi` et `A_chi` sont donc très loin d'épuiser les deux réponses.

### Niveau I1 — types fonctionnels des translations élémentaires

- P1 : `R=19`, `N=80`, `M=6`, `B=1567`.
- P2 : `R=14`, `N=58`, `M=6`, `B=1567`.
- profil conjoint : `R=21`, `N=88`, `M=6`, `B=1567`.
- cellules séparées simultanément : `12`.

La majeure partie du résidu historique est donc absorbée par les types de conjugaison des translations élémentaires.

### Niveau I2 — signatures des semigroupes de translations

- P1 : `R=7`, `N=30`, `M=6`, `B=1582`.
- P2 : `R=2`, `N=8`, `M=4`, `B=1582`.
- profil conjoint : `R=7`, `N=30`, `M=6`, `B=1582`.
- cellules séparées simultanément : `2`.

P2 est presque entièrement déterminé par les structures standards de semigroupes de translations ; P1 conserve encore sept cellules ambiguës.

### Niveau I3 — signature statique de l'associateur

- P1 : `R=0`, `N=0`, `M=0`, `B=1590`.
- P2 : `R=0`, `N=0`, `M=0`, `B=1590`.
- profil conjoint : `R=0`, `N=0`, `M=0`, `B=1590`.
- cellules séparées simultanément : `0`.

**Observation exacte :** sur la population chirale d'ordre 3, l'information cumulative jusqu'à la signature de l'associateur suffit à déterminer complètement les deux profils P1/P2.

Le niveau `I3` ne distingue pourtant pas toutes les classes modulo opposition : `3 192` classes chirales forment `1 596` paires opposées, tandis que `D_3` ne produit que `1 590` cellules. Il subsiste donc au moins six collisions statiques entre paires opposées distinctes, mais ces collisions ont exactement les mêmes profils P1 et P2. La détermination n'est donc pas obtenue simplement en identifiant chaque classe individuelle.

### Niveau I4 — petits termes statiques

- P1 : `R=0`, `B=1596`.
- P2 : `R=0`, `B=1596`.
- profil conjoint : `R=0`, `B=1596`.

Le descripteur riche `I4` sépare exactement les `1 596` paires d'opposés, mais cette information supplémentaire n'est pas nécessaire pour expliquer les sorties dynamiques étudiées.

## Décision scientifique

### Établi dans ce modèle fini

1. Les 42 strates du protocole 1 ne constituaient pas un résidu face à une hiérarchie statique plus riche : la hiérarchie gelée les raffine jusqu'à détermination complète de P1.
2. L'échec de transport P1 -> P2 n'exige pas l'introduction d'une propriété dynamique intrinsèque manquante : les deux profils sont tous deux fonctions de la description statique cumulative `D_3` sur cette population.
3. P2 est presque absorbé dès les signatures de semigroupes de translations ; l'associateur élimine les deux dernières cellules ambiguës.
4. P1 nécessite davantage de structure : sept cellules restent ambiguës après les semigroupes, puis disparaissent avec la signature de l'associateur.

### Non établi

Ce résultat ne démontre pas que la signature choisie est minimale, conceptuellement unique ou générale au-delà de l'ordre 3. Il ne montre pas non plus que toute dynamique chirale est réductible à ces invariants.

La signature `I3` est riche. Le résultat exact porte sur une suffisance dans la population finie testée, pas sur une loi universelle.

## Effet sur l'hypothèse temporelle

La branche compositionnelle est **affaiblie davantage** : les deux réponses algébriques qui avaient motivé une recherche de « couplabilité » sont entièrement déterminées, à l'ordre 3, par une hiérarchie statique standard arrêtée avant calcul.

Il n'existe donc plus, dans P1/P2 à cet ordre, de résidu exact justifiant de baptiser une nouvelle propriété intrinsèque de couplabilité.

Cela ne réfute pas toute hypothèse compositionnelle possible ; cela ferme cette voie particulière tant qu'une nouvelle prédiction indépendante n'est pas motivée par autre chose que l'ajustement aux sorties P1/P2.

## Prochaine action correcte

Ne pas lancer P3.

Une analyse exploratoire autorisée peut maintenant ablater les composantes de `I3` pour déterminer quelle partie précise de la signature de l'associateur absorbe les sept cellules P1 et les deux cellules P2. Cette analyse doit rester descriptive et ne peut pas reclasser l'issue confirmatoire `standard_absorption`.

Une nouvelle expérience dynamique ou un passage à l'ordre 4 ne serait justifié qu'après formulation d'une prédiction indépendante qui ne soit pas construite pour échapper à cette absorption.
