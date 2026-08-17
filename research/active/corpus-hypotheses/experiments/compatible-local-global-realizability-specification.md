# Spécification du lien entre compatibilités locales et réalisabilité globale

## Statut et portée

Spécification théorique sans exécution ni résultat expérimental.

Elle traite uniquement la condition de réalisabilité globale. Elle ne suppose
ni qu'une clique est réalisable, ni qu'une compatibilité non observée est une
incompatibilité réelle.

Tant qu'aucune loi interne reliant les niveaux local et global n'est établie,
le statut reste `unknown`.

## 1. Objets minimaux

Soient :

- `S`, un système dont la frontière, l'environnement et les ressources sont
  fixés ;
- `D(S)`, un ensemble fini de distinctions ;
- `Ω_S`, l'ensemble des états globaux admissibles du système ;
- `P_x ⊆ Ω_S`, les états dans lesquels la distinction `x` est réalisée.

La réalisabilité globale d'un ensemble `A ⊆ D(S)` est définie par l'existence
d'un témoin commun :

```text
J_S(A) ⇔ il existe ω ∈ Ω_S tel que ω ∈ P_x pour tout x ∈ A.
```

Une compatibilité locale positive entre `x` et `y` signifie donc :

```text
J_S({x,y}) ⇔ P_x ∩ P_y ≠ ∅.
```

Le témoin doit être un même état global. Des états distincts réalisant chaque
paire séparément ne constituent pas un témoin pour la famille entière.

## 2. Information locale à trois valeurs

Pour ne pas transformer une lacune d'observation en incompatibilité, chaque
relation locale doit pouvoir prendre trois statuts :

```text
compatible établie | incompatible établie | inconnue
```

Une clique candidate à la réalisation globale ne peut être formée qu'à partir
de compatibilités positivement établies. Une relation `inconnue` ne crée ni
arête certaine ni interdiction certaine.

La présente spécification ne qualifie pas la complétude du graphe. Elle impose
seulement que l'absence de preuve locale ne soit pas utilisée comme preuve
d'incompatibilité.

## 3. Hypothèses minimales communes

Toute loi locale–globale candidate doit satisfaire les hypothèses suivantes
avant de pouvoir relier des compatibilités locales à un contexte réalisable.

### H1 — domaine global antérieur

`Ω_S`, `D(S)`, la frontière du système et les ressources disponibles sont
définis avant la construction des contextes. Ils ne peuvent pas être ajustés
pour faire disparaître une obstruction.

### H2 — sens uniforme de la réalisation

Tous les prédicats `P_x` utilisent la même notion de réalisation : même régime,
même environnement et même sens de la simultanéité. Une compatibilité obtenue
dans des régimes mutuellement exclusifs ne peut pas être recollée.

### H3 — correction locale

Toute compatibilité locale déclarée positive possède au moins un témoin dans
`Ω_S`. Une association, une corrélation ou une succession ne suffit pas si le
contrat exige la coexistence.

### H4 — fermeture descendante

Si `J_S(A)` est vrai, alors `J_S(B)` est vrai pour chaque `B ⊆ A`. Si cette
propriété échoue, les contextes réalisables ne forment pas un complexe
simplicial et le modèle actuel doit être remplacé.

### H5 — loi de passage explicite

La taille des données locales suffisantes, la condition de cohérence et la
conclusion globale sont déclarées indépendamment du contexte obtenu. La loi ne
peut pas être « toute clique observée est réalisable » sans justification
supplémentaire.

### H6 — invariance de représentation

Renommage, réénumération, changement de sérialisation et remplacement par une
description logiquement équivalente ne modifient ni la réalisabilité globale
ni l'application de la loi locale–globale.

### H7 — témoin ou obstruction indépendant

La loi doit définir ce qui certifie une réalisation globale et ce qui peut
l'interdire. Une conclusion qui réinterprète toute absence de témoin comme un
défaut de mesure n'est pas discriminante.

## 4. Lois internes susceptibles d'assurer le passage

Les options suivantes sont des formes possibles du lien. Aucune n'est tenue
pour établie par ce document.

### 4.1 Loi flag ou propriété de Helly d'ordre 2

La forme la plus forte adaptée à un graphe simple est :

```text
[pour toutes paires {x,y} ⊆ A, J_S({x,y})] ⇒ J_S(A).
```

Dans la représentation par ensembles d'états, cela exige que toute sous-famille
finie des `P_x` ayant des intersections deux à deux non vides possède une
intersection globale non vide.

Cette propriété doit découler d'une structure de `Ω_S` et des `P_x`, ou d'un
théorème propre à la classe de systèmes. Elle ne découle pas de la seule
présence d'un triangle ou d'une clique dans le graphe.

### 4.2 Loi locale d'ordre `k`

Le système peut posséder un entier intrinsèque `k ≥ 2` tel que :

```text
[pour tout B ⊆ A avec |B| ≤ k, J_S(B)] ⇒ J_S(A).
```

`k` doit être fixé par les lois du système, non choisi après observation. Si
`k > 2`, le graphe simple est insuffisant : il faut représenter les
compatibilités d'ordre supérieur jusqu'à `k`.

### 4.3 Loi de recollement

Les parties locales peuvent porter des témoins `ω_i` munis d'applications de
restriction. Une réalisation globale existe si :

- les témoins locaux couvrent le contexte candidat ;
- leurs restrictions coïncident sur tous les recouvrements pertinents ;
- l'obstruction de recollement définie par le système s'annule ;
- un théorème interne garantit alors l'existence d'un témoin global.

La compatibilité des supports ne suffit pas : ce sont les données locales
elles-mêmes qui doivent être cohérentes.

### 4.4 Loi de faisabilité globale

Les compatibilités locales peuvent servir de filtres, mais la décision finale
est donnée par une contrainte globale indépendante : équation, conservation,
budget de ressource, état stationnaire ou autre condition nécessaire et
suffisante dérivée des lois de `S`.

Cette option ne réduit pas la réalisabilité aux arêtes. Elle reconnaît que le
graphe est une projection partielle d'un objet global plus riche.

## 5. Formation des contextes complets

Une fois `J_S` établi indépendamment, et seulement alors, la famille des
contextes complets est :

```text
C(S) = { A ⊆ D(S) |
         J_S(A) et, pour tout x ∈ D(S) \ A,
         non J_S(A ∪ {x}) }.
```

La maximalité est relative au domaine fixé. Elle ne doit pas être confondue
avec :

- la plus grande taille observée ;
- la saturation d'un instrument ;
- l'arrêt d'un algorithme ;
- l'absence d'une extension dans un échantillon ;
- une limite de temps ou de ressources non constitutive de `S`.

## 6. Contre-exemples possibles

### 6.1 Triangle sans réalisation triple

Prendre trois distinctions `a`, `b`, `c` et des états globaux réalisant
exactement `ab`, `ac` ou `bc`, mais jamais `abc`. Toutes les paires sont
compatibles ; la triple intersection est vide. Le graphe est un triangle, mais
le triplet n'est pas réalisable.

Ce contre-exemple formel montre que le graphe seul n'identifie pas la
réalisabilité globale.

### 6.2 Contrainte de ressource supérieure

Chaque paire peut respecter un budget, tandis que trois éléments le dépassent.
L'incompatibilité apparaît seulement à l'ordre trois.

### 6.3 Contraintes localement satisfaisables mais globalement contradictoires

Chaque sous-système possède une solution, mais l'ensemble des contraintes
forme un cycle contradictoire. L'existence locale ne se recolle pas en une
solution globale.

### 6.4 Témoins issus de branches environnementales distinctes

`ab`, `ac` et `bc` peuvent être réalisés sous trois états incompatibles de
l'environnement. Les réunir efface une variable constitutive et crée un faux
contexte global.

### 6.5 Compatibilité successive confondue avec coexistence

Chaque paire peut apparaître à des moments différents sans qu'un même état ne
les porte toutes. Une fenêtre d'observation large fabrique alors une clique
temporelle qui n'est pas une réalisation simultanée.

### 6.6 Relation locale inconnue

Une paire non observée peut être compatible mais sous le seuil ou hors de la
fenêtre de détection. La traiter comme incompatible peut fermer artificiellement
un contexte réellement extensible.

### 6.7 Distinction omise

Un ensemble peut paraître maximal uniquement parce qu'une distinction
pertinente est absente de `D(S)`. Cette situation renverse la prétention de
complétude du contexte, pas nécessairement sa réalisabilité interne.

## 7. Conditions de renversement

### 7.1 Renversement d'une loi flag

La loi est renversée par un seul ensemble `A` tel que :

- chaque paire de `A` est positivement établie comme réalisable dans le même
  régime ;
- aucun état global admissible ne réalise `A` ;
- la capacité de détecter ou certifier cette absence globale est établie.

Une simple non-observation de `A` ne suffit pas.

### 7.2 Renversement d'une loi d'ordre `k`

La loi est renversée par un ensemble `A` dont toutes les parties de taille au
plus `k` sont réalisables, mais qui ne possède aucun témoin global sous les
mêmes conditions.

### 7.3 Renversement d'une loi de recollement

La loi est renversée par des témoins locaux satisfaisant toutes les conditions
de cohérence préenregistrées mais ne possédant aucun recollement global, ou par
un recollement déclaré impossible alors qu'un témoin global existe.

### 7.4 Renversement de l'internalité

Le principe doit être requalifié si :

- la loi dépend de l'ordre de collecte, d'une étiquette ou d'un seuil externe ;
- deux représentations équivalentes donnent des décisions globales différentes ;
- modifier uniquement la fenêtre ou le dispositif d'observation change les
  contextes sans changer `S` ;
- une variable omise explique la différence entre local et global ;
- la frontière ou l'ordre local `k` est choisi après inspection des contextes.

### 7.5 Non-renversements

Ne constituent pas à eux seuls un renversement :

- une compatibilité locale non observée lorsque sa détectabilité est inconnue ;
- l'absence de témoin global lorsque le protocole ne pouvait pas le détecter ;
- un changement de contexte après modification réelle des lois, ressources ou
  frontières du système ;
- l'échec d'une clique contenant au moins une paire au statut `inconnu`.

Ces cas maintiennent la conclusion à `unknown`.

## 8. Porte de qualification

Le passage des compatibilités locales aux contextes complets peut être qualifié
d'interne seulement si :

1. la réalisabilité possède une sémantique par témoin global commun ;
2. les compatibilités locales positives sont correctes dans un régime uniforme ;
3. une loi flag, une borne locale `k`, un théorème de recollement ou une loi de
   faisabilité globale découle indépendamment des contraintes de `S` ;
4. les variables et obstructions nécessaires sont représentées ;
5. la loi survit aux transformations neutres ;
6. ses conditions de renversement sont détectables et ne reposent pas sur
   l'assimilation de l'inconnu à l'impossible.

## Verdict

Les compatibilités locales ne déterminent pas seules les contextes globalement
réalisables. Le lien exige une loi interne supplémentaire : propriété flag,
localité bornée, recollement ou faisabilité globale.

Aucune de ces lois n'est établie pour le modèle actuel par la seule définition
du graphe. La formation des cliques reste donc une complétion mathématique, non
une preuve de réalisabilité conjointe. Le statut demeure `unknown`.
