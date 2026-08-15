# Sous-détermination de la réalisabilité globale par les compatibilités locales

## Statut et question

Analyse formelle sans expérience, sans interprétation physique et sans
modification des résultats historiques.

Question : deux systèmes peuvent-ils partager exactement les mêmes
compatibilités locales tout en ayant des réalisabilités globales différentes ?

Réponse formelle : **oui**. Le contre-exemple minimal apparaît avec trois
distinctions.

Cette réponse établit une sous-détermination du formalisme par le graphe local.
Elle ne sélectionne aucune loi interne pour un système étudié. Le statut
scientifique reste `unknown` jusqu'à discrimination indépendante.

## 1. Sens exact de « mêmes compatibilités locales »

Soit `D = {a,b,c}`. Pour un système `S`, noter `J_S(A)` la réalisabilité
conjointe du sous-ensemble `A ⊆ D`.

Les données locales d'ordre deux sont :

```text
L_2(S) = { A ⊆ D | |A| ≤ 2 et J_S(A) }.
```

Deux systèmes ont exactement les mêmes compatibilités locales si leurs
prédicats de réalisabilité coïncident sur tous les singletons et toutes les
paires. Cette égalité est plus forte qu'un simple accord sur un échantillon :
aucune paire n'est inconnue dans le contre-exemple.

## 2. Contre-exemple minimal

### 2.1 Système globalement réalisable `S_+`

Définir le complexe de réalisabilité :

```text
K_+ = P({a,b,c}).
```

Toutes les parties sont réalisables, y compris `{a,b,c}`. Son unique contexte
complet maximal est :

```text
C(S_+) = {{a,b,c}}.
```

### 2.2 Système avec obstruction ternaire `S_-`

Définir :

```text
K_- = P({a,b,c}) \ {{a,b,c}}.
```

Tous les singletons et toutes les paires sont réalisables, mais le triplet ne
l'est pas. Ses contextes complets maximaux sont :

```text
C(S_-) = {{a,b}, {a,c}, {b,c}}.
```

### 2.3 Égalité locale et différence globale

On a exactement :

```text
L_2(S_+) = L_2(S_-)
          = {∅, {a}, {b}, {c}, {a,b}, {a,c}, {b,c}}.
```

Les deux graphes locaux sont donc le même graphe complet `K_3`.

En revanche :

```text
J_{S_+}({a,b,c}) = vrai
J_{S_-}({a,b,c}) = faux.
```

Le reste qui distingue les deux systèmes est la présence ou l'absence de la
face d'ordre trois `{a,b,c}`. Cette différence change les contextes complets et
ne peut pas être reconstruite depuis le seul graphe.

## 3. Réalisation par témoins globaux

Le même contre-exemple peut être écrit sans supposer les complexes comme
objets primitifs.

Pour `S_+`, prendre un état `ω_abc` réalisant simultanément `a`, `b` et `c`.

Pour `S_-`, prendre trois états :

```text
ω_ab réalise exactement a et b
ω_ac réalise exactement a et c
ω_bc réalise exactement b et c
```

Chaque paire possède un témoin global dans les deux systèmes. Seul `S_+`
possède un même témoin pour le triplet. La réunion de trois témoins locaux
différents ne produit pas un témoin commun.

## 4. Généralisation à tout ordre local fini

La sous-détermination ne concerne pas seulement les graphes.

Pour un entier `k ≥ 1`, prendre `D` de taille `k+1` et définir :

```text
K_+ = P(D)
K_- = P(D) \ {D}.
```

Les deux systèmes coïncident sur toute réalisabilité d'ordre au plus `k`, mais
diffèrent sur la réalisation globale de `D`.

Ainsi, connaître exhaustivement toutes les compatibilités jusqu'à un ordre
fini `k` ne détermine pas les compatibilités d'ordre `k+1` sans une propriété
supplémentaire bornant l'arité des obstructions.

## 5. Information supplémentaire manquante

Le graphe local omet au moins l'une des informations suivantes :

1. **hypercompatibilités** : la valeur de `J_S(A)` pour les ensembles de taille
   supérieure à deux ;
2. **identité des témoins** : quelles compatibilités locales sont réalisées par
   un même état global plutôt que par des états différents ;
3. **obstructions supérieures** : contraintes ternaires ou d'ordre plus élevé
   invisibles sur chaque paire ;
4. **données de recollement** : restrictions, cohérences et obstructions entre
   témoins locaux ;
5. **loi globale** : conservation, ressource ou équation susceptible de refuser
   une combinaison dont toutes les paires sont permises ;
6. **borne d'arité** : un entier interne `k` au-delà duquel aucune nouvelle
   obstruction minimale ne peut apparaître.

Pour lever la sous-détermination, il faut donc soit observer ou spécifier les
hypercompatibilités, soit établir indépendamment une loi rendant ces données
déductibles des compatibilités locales.

## 6. Propriétés qui forceraient l'équivalence

Deux systèmes ayant le même graphe auraient les mêmes contextes globaux si une
propriété supplémentaire commune imposait :

```text
J_S(A) ⇔ toutes les paires de A sont réalisables.
```

C'est la propriété flag ou Helly d'ordre deux. Elle rend le complexe entier
égal au complexe de cliques de son graphe `1`-squelette.

Plus généralement, des données identiques jusqu'à l'ordre `k` forceraient les
mêmes réalisabilités globales si les deux systèmes appartenaient à une classe
`k`-déterminée :

```text
J_S(A) ⇔ J_S(B) pour tout B ⊆ A avec |B| ≤ k.
```

Cette propriété ne vient pas des données locales elles-mêmes. Elle doit être
une loi ou un théorème indépendant portant sur la classe de systèmes.

## 7. Condition de discrimination

La sous-détermination formelle est levée pour un système déterminé seulement
si une information indépendante tranche entre `K_+` et `K_-`, par exemple :

- un témoin commun certifié pour le triplet ;
- une obstruction ternaire certifiée ;
- une loi flag établie avant l'examen du triplet ;
- une loi globale nécessaire et suffisante décidant sa réalisabilité ;
- un théorème de recollement appliqué à des témoins locaux identifiés.

Une absence de témoin sans détectabilité établie maintient `unknown`. Une
non-arête manquante n'intervient pas dans ce contre-exemple : toutes les
compatibilités locales sont positives et exactement connues.

## 8. Conclusion bornée

Le graphe complet des compatibilités locales ne détermine pas la réalisabilité
globale. Deux complexes peuvent avoir exactement le même `1`-squelette et des
facettes maximales différentes.

Le contre-exemple établit la possibilité formelle de la sous-détermination. Il
ne dit pas lequel des deux systèmes représente l'objet étudié et ne démontre
aucune loi physique. Tant qu'une information d'ordre supérieur ou une loi
interne n'est pas établie, la classification scientifique reste `unknown`.
