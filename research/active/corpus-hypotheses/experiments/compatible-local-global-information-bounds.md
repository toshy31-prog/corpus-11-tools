# Bornes minimales d'information entre local et global

## Statut et portée

Spécification formelle sans expérience ni interprétation physique.

Elle compare uniquement :

1. l'information explicite d'ordre supérieur ;
2. une représentation équivalente complète ;
3. un mécanisme de compression.

Elle ne sélectionne aucune représentation. Le statut scientifique reste
`unknown`.

## 1. Cadre

Soit `D` un ensemble fini de `n` distinctions. La réalisabilité est un prédicat
descendant `J(A)` : si `J(A)` est vrai, alors `J(B)` est vrai pour tout
`B ⊆ A`.

Le complexe global est :

```text
K = { A ⊆ D | J(A) }.
```

Les données locales `L_2` fixent `J(A)` pour `|A| ≤ 2`. Noter :

```text
Comp(L_2) = ensemble des complexes globaux compatibles avec L_2.
M(L_2) = |Comp(L_2)|.
```

Lorsque `M(L_2) > 1`, une information supplémentaire est nécessaire pour
identifier le complexe global.

## 2. Quantité logique et certificat

Deux quantités ne doivent pas être confondues :

- **information de décision** : la valeur booléenne de `J(A)` ;
- **information de preuve** : le témoin ou l'obstruction permettant de vérifier
  cette valeur indépendamment.

Un bit suffit à encoder une réponse binaire lorsque `A` est déjà connu. Il ne
suffit pas nécessairement à prouver la réponse. La taille minimale d'un
certificat dépend du langage des états, contraintes et preuves du système ; il
n'existe pas de borne universelle à partir de `n` seul.

## 3. Décider un ensemble donné

### 3.1 Simple réalisabilité

Pour un ensemble fixé `A`, non déterminé par `L_2` :

```text
minimum logique = un bit qualifié J(A).
```

Ce bit doit être accompagné de sa provenance : valeur primitive, témoin,
obstruction ou loi complète. Sans provenance, il s'agit d'une déclaration, pas
d'une décision vérifiable.

Une représentation équivalente complète permet aussi de décider `A` si elle
possède un décodeur total donnant exactement `J(A)`.

Un mécanisme de compression suffit seulement si son domaine inclut `A` et si
sa complétude est démontrée. L'échec du mécanisme ne vaut pas automatiquement
`J(A) = faux`.

### 3.2 Être un contexte complet

Un ensemble `A` est un contexte complet, c'est-à-dire une facette, si et
seulement si :

```text
J(A) = vrai
et
J(A ∪ {x}) = faux pour tout x ∈ D \ A.
```

Grâce à la fermeture descendante, il suffit de tester les extensions par un
seul élément : toute extension réalisable plus grande rendrait réalisable au
moins une extension `A ∪ {x}`.

Dans une table explicite directe, la borne brute est donc :

```text
1 + (n - |A|) décisions qualifiées.
```

Cette borne peut être réduite par une preuve globale de maximalité ou une
représentation par facettes. Le coût de cette preuve ou de cette représentation
doit alors être compté ; il n'a pas disparu.

## 4. Prouver une impossibilité

### 4.1 Certificat direct

Pour établir `J(A) = faux`, il suffit de fournir une obstruction certifiée
`B ⊆ A` telle que `J(B) = faux`. Par fermeture descendante de la réalisabilité,
aucun sur-ensemble de `B`, donc pas `A`, ne peut être réalisable.

Le certificat minimal relatif à un langage de preuve est :

```text
identité de B + preuve vérifiable que J(B) = faux.
```

Une obstruction minimale — dont toutes les parties propres sont réalisables —
est informative, mais la minimalité n'est pas nécessaire pour prouver
l'impossibilité de `A`.

### 4.2 Preuve exhaustive

En l'absence d'une obstruction locale, une preuve d'impossibilité peut
énumérer ou exclure exhaustivement tous les témoins globaux possibles. Elle
doit alors contenir :

- le domaine complet des témoins ;
- un argument de couverture ;
- la raison pour laquelle chacun échoue.

Une liste de témoins observés qui ne contient pas `A` n'est pas une preuve
d'impossibilité si son exhaustivité n'est pas établie.

### 4.3 Limite informationnelle

Dans une table explicite tenue pour primitive, un seul bit faux décide
logiquement l'impossibilité. Mais aucun nombre fixe de bits dépendant seulement
de `n` ne garantit une preuve vérifiable dans tous les langages de système.
Le coût peut se déplacer dans la définition de l'obstruction, du domaine ou du
vérificateur.

## 5. Reconstruire tous les contextes

### 5.1 Table explicite d'ordre supérieur

Une représentation directe donne `J(A)` pour chaque ensemble admissible de
taille au moins trois. Si toutes les paires sont locales et fixées, une borne
supérieure brute est :

```text
Σ_{i=3..n} binom(n,i) bits.
```

Les contraintes de fermeture rendent certaines tables invalides et permettent
parfois une représentation plus courte. Cette somme est une représentation
directe, pas une borne inférieure universelle.

### 5.2 Borne inférieure par complétions

Toute représentation fixe ou préfixe, injective et sans perte des complexes de
`Comp(L_2)` exige dans le pire cas au moins :

```text
ceil(log2 M(L_2)) bits.
```

Sinon, deux complexes distincts recevraient le même code et le décodeur ne
pourrait pas reconstruire les deux.

Pour un graphe local complet sur `n` sommets, il existe au moins
`2^binom(n,3)` complétions : inclure tous les singletons et toutes les paires,
choisir arbitrairement un sous-ensemble des triplets, et n'inclure aucune face
de taille supérieure.

Il en résulte la borne formelle :

```text
ceil(log2 M(K_n)) ≥ binom(n,3).
```

Ainsi, le graphe complet seul ne permet pas une compression uniforme sans
information structurelle supplémentaire, même si l'on se limite aux
obstructions ternaires.

## 6. Représentations équivalentes complètes

Une représentation est équivalente et complète si elle permet de reconstruire
exactement `J(A)` pour tout `A ⊆ D`.

### 6.1 Facettes

L'antichaîne des facettes détermine le complexe :

```text
K = union_{F facette} P(F).
```

Elle est compacte lorsque le nombre de facettes est petit. Elle peut être
grande dans le pire cas.

### 6.2 Non-faces minimales

L'antichaîne des obstructions minimales détermine également `K` :

```text
A ∈ K ⇔ aucune non-face minimale B n'est incluse dans A.
```

Elle est compacte lorsque les impossibilités ont peu de générateurs minimaux.

### 6.3 Témoins exhaustifs

Une incidence exhaustive entre témoins globaux et distinctions détermine les
ensembles réalisables comme les sous-ensembles des supports de témoins. Elle
est équivalente seulement si l'exhaustivité est certifiée et si les
multiplicités sans portée sont quotientées de manière déclarée.

### 6.4 Condition d'équivalence

Pour un encodeur `E` et un décodeur `D`, l'exigence est :

```text
D(E(K)) = K pour tout K de la classe annoncée.
```

Deux représentations donnant les mêmes réponses sur quelques requêtes mais pas
sur toutes ne sont pas équivalentes complètes.

## 7. Mécanisme de compression

Un mécanisme de compression ajoute une règle ou un programme `R` et des
paramètres `θ` :

```text
K = Decode(R, θ, L_2).
```

Il est sans perte seulement si :

- `R` et son domaine sont fixés ;
- `θ` contient toutes les exceptions et conditions nécessaires ;
- le décodage est total et unique sur la classe annoncée ;
- la reconstruction de chaque `J(A)` est exacte ;
- deux complexes distincts n'ont jamais le même code complet ;
- les invariances de représentation sont préservées.

### 7.1 Coût total à compter

La longueur réelle comprend :

```text
description de R
+ paramètres θ
+ frontière et classe de validité
+ exceptions
+ données auxiliaires du décodeur.
```

Une courte sortie accompagnée d'un décodeur contenant la table globale n'est
pas une compression. Elle déplace le coût.

Si `R` est partagé entre de nombreux systèmes, son coût peut être amorti, mais
la preuve que tous appartiennent à sa classe reste nécessaire.

### 7.2 Quand une compression est démontrable

Une compression sans perte est possible sur une classe structurée lorsqu'un
théorème de reconstruction existe, par exemple :

- le graphe pour une classe de complexes flag ;
- le `k`-squelette pour une classe prouvée `k`-déterminée ;
- une liste de facettes ou de non-faces minimales ;
- un système de contraintes nécessaire et suffisant ;
- une règle de composition complète avec décodeur exact.

Le théorème, la classe et leurs paramètres font partie de l'information.

### 7.3 Limite générale

Sur la classe arbitraire `Comp(L_2)`, aucune compression injective ne peut
avoir une longueur maximale inférieure à la borne de comptage. Une compression
peut raccourcir certains complexes, mais d'autres doivent conserver une
description suffisamment longue pour distinguer toutes les complétions.

## 8. Réfutation d'une prétention de compression sans perte

La prétention est réfutée si :

- deux complexes distincts reçoivent le même code ;
- le décodeur donne une valeur incorrecte pour au moins un `J(A)` ;
- une facette ou une obstruction minimale n'est pas reconstructible ;
- la reconstruction dépend d'un oracle ou d'une table non comptée ;
- une transformation équivalente change le complexe décodé ;
- la classe de validité est élargie après observation d'un échec ;
- les paramètres ou exceptions stockent implicitement toute la table annoncée
  comme compressée.

Un seul reste de réalisabilité différent suffit à établir la perte.

## 9. Comparaison bornée

| Forme | Ce qu'elle stocke | Garantie possible | Limite principale |
|---|---|---|---|
| Ordre supérieur explicite | valeurs de `J(A)` | décision directe sur les entrées qualifiées | croissance combinatoire et inconnues restantes |
| Représentation complète | facettes, non-faces ou témoins exhaustifs | reconstruction exacte par identité | taille variable, exhaustivité à certifier |
| Mécanisme de compression | règle, paramètres et domaine | reconstruction exacte si théorème complet | coût caché du décodeur et validité de classe |

## 10. Réponses aux quatre questions

1. **Décider un contexte donné** : un bit qualifié décide sa réalisabilité ;
   reconnaître une facette exige aussi de décider toutes ses extensions par un
   élément, soit `1 + n - |A|` décisions directes au pire.
2. **Prouver une impossibilité** : une obstruction certifiée incluse dans le
   candidat suffit ; sinon il faut une preuve exhaustive d'absence de témoin.
   Il n'existe pas de taille universelle de certificat fondée sur `n` seul.
3. **Reconstruire tous les contextes** : il faut une représentation injective
   des `M(L_2)` complétions, donc au moins `ceil(log2 M(L_2))` bits dans le pire
   cas, ou leur équivalent informationnel.
4. **Compression équivalente sans perte** : oui pour une classe structurée
   munie d'un théorème de reconstruction ; non comme garantie uniforme sous la
   borne de comptage pour les complétions arbitraires.

Ces bornes concernent le formalisme. Elles ne déterminent pas quelle structure
appartient à un système donné. Le statut scientifique reste `unknown`.
