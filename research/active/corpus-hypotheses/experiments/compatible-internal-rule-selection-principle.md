# Candidat de principe interne de sélection d'une règle

## Statut

Spécification théorique préparatoire, sans exécution ni résultat expérimental.

Ce document ne sélectionne pas encore scientifiquement une règle. Il formalise
un candidat de principe capable, sous des hypothèses explicites, de dériver une
règle depuis le système de compatibilités plutôt que depuis un classement
externe par simplicité.

Le statut de `compatible-rule-family-001` reste `unknown`.

## 1. Frontière à ne pas masquer

Une règle ne peut jamais être dérivée d'une structure totalement dépourvue de
sémantique. Le candidat proposé est interne **conditionnellement** à
l'interprétation suivante, fixée avant toute expérience :

> les facettes du complexe sont exactement les contextes compatibles complets
> possibles du système, et une implication `x → y` signifie que la présence de
> `x` dans un contexte complet exige la présence de `y` dans ce même contexte.

Si les facettes sont seulement des observations incomplètes, un échantillon ou
le produit d'un protocole de mesure, la règle dérivée décrit ce dispositif et
non nécessairement le système. La présente spécification ne doit pas absorber
cette différence.

## 2. Structure requise des compatibilités

Le système admissible est un complexe simplicial fini `K` sur un ensemble fini
de distinctions `D` :

- toute partie d'un ensemble compatible est compatible ;
- chaque distinction appartient à au moins une face ;
- les facettes `Fac(K)` sont les faces maximales pour l'inclusion ;
- `Fac(K)` est complet relativement au modèle, et non sélectionné selon une
  taille, un score ou un résultat ;
- aucune étiquette, métrique, probabilité, chronologie ou pondération externe
  n'est nécessaire pour déterminer `Fac(K)` ;
- les multiplicités de présentation et l'ordre d'énumération n'ont aucune
  portée sémantique.

Deux distinctions peuvent avoir exactement les mêmes occurrences. Elles ne
doivent alors pas être départagées artificiellement : elles formeront une même
classe extensionnelle.

Le principe ne s'applique pas tel quel aux données partielles, bruitées,
pondérées ou temporelles. Ces cas exigeraient un nouveau contrat sémantique,
préenregistré séparément.

## 3. Principe d'implication intrinsèque

Pour toute distinction `x`, définir son support contextuel intrinsèque :

```text
Supp_K(x) = { F ∈ Fac(K) | x ∈ F }.
```

La relation candidate est :

```text
x ≼_K y  si et seulement si  Supp_K(x) ⊆ Supp_K(y).
```

Elle se lit : tout contexte compatible complet qui réalise `x` réalise aussi
`y`. De manière équivalente, en posant

```text
cl_K(A) = intersection des facettes contenant A,
```

on a `x ≼_K y` si et seulement si `y ∈ cl_K({x})`.

Cette relation est un préordre. L'équivalence
`x ~_K y ⇔ Supp_K(x) = Supp_K(y)` regroupe les distinctions
extensionnellement indiscernables ; le quotient de `≼_K` par `~_K` est un ordre
partiel. Sa partie stricte constitue l'ordre dérivé candidat.

La direction de la flèche appartient au sens préenregistré de l'implication.
L'ordre inverse ne constitue pas une règle concurrente sous le même contrat :
il exprime une autre lecture sémantique.

## 4. Pourquoi ce candidat est interne

Le principe n'optimise ni score ni longueur de description. Il retient **toutes
et seulement** les implications unaires valides dans tous les contextes
complets intrinsèques.

Il possède la caractérisation universelle suivante :

- **correction contextuelle** : si `x ≼ y`, aucune facette ne contient `x` sans
  contenir `y` ;
- **complétude contextuelle** : si aucune facette ne contient `x` sans `y`,
  alors `x ≼ y` ;
- **extensionalité** : deux distinctions ayant le même support sont
  équivalentes ;
- **naturalité** : un isomorphisme du complexe transporte exactement la
  relation dérivée.

La relation `≼_K` est l'unique relation satisfaisant simultanément correction
et complétude pour cette sémantique unaire. Une autre relation distincte doit
soit omettre une implication valide, soit ajouter une implication réfutée par
une facette, soit changer le sens de ce qui est appelé implication.

L'internalité est donc limitée mais précise : la règle est forcée par
l'incidence `distinction–facette` une fois que cette incidence est reconnue
comme la totalité des contextes complets possibles.

## 5. Transformations sous lesquelles la règle doit persister

Les transformations suivantes doivent laisser le principe inchangé ou le
transporter de façon canonique :

1. **Renommage bijectif des distinctions** : pour tout isomorphisme `φ`,
   `x ≼_K y` si et seulement si `φ(x) ≼_{φ(K)} φ(y)`.
2. **Permutation d'énumération** : changer l'ordre des distinctions, faces ou
   facettes ne change aucune classe ni relation.
3. **Sérialisation équivalente** : ajouter, retirer ou réordonner des sous-faces
   déjà impliquées par les facettes ne change pas le résultat.
4. **Duplication de présentation** : répéter une facette sans lui attribuer de
   poids ne change pas le résultat.
5. **Quotient extensional** : fusionner des distinctions ayant le même support
   conserve exactement l'ordre entre leurs classes.
6. **Expansion par clones extensionnels** : remplacer une distinction par des
   clones toujours co-présents ne doit pas changer l'ordre après quotient des
   clones.
7. **Isomorphisme de l'incidence** : toute bijection préservant l'incidence
   entre distinctions et facettes transporte le même préordre.

Une modification qui ajoute ou retire une véritable facette n'est pas une
transformation neutre : elle change les possibilités du système et peut donc
changer légitimement la règle.

## 6. Règles exclues par le principe

Sont exclues :

- les règles dépendant des noms, indices, masques, graines ou ordres de
  présentation ;
- les règles sélectionnant les facettes selon leur cardinalité, un seuil, une
  fréquence ou un score externe ;
- les règles fondées sur le degré, une distance, une géométrie, un ordre
  temporel ou une pondération absents du contrat ;
- les règles ajoutant une relation contredite par au moins une facette ;
- les règles omettant volontairement une implication valide dans toutes les
  facettes ;
- les règles qui départagent deux distinctions de même support ;
- les règles toujours vides ou toujours complètes lorsqu'elles violent la
  correction ou la complétude contextuelle ;
- toute règle ajustée en fonction d'un résultat, d'une classification ou d'un
  contrôle ;
- toute variante qui modifie la signification d'« implication » tout en se
  présentant comme un départage au sein de la même famille.

Une règle intrinsèque utilisant une autre propriété du complexe, par exemple
le degré, n'est pas déclarée fausse. Elle est exclue de **ce** principe parce
qu'elle ne compile pas la sémantique « vrai dans tous les contextes complets ».
Elle devrait annoncer une autre relation et un autre contrat.

## 7. Conditions de renversement

Le principe doit être retiré ou requalifié dans chacun des cas suivants.

### 7.1 Renversement formel

- Deux relations distinctes satisfont la même correction, la même complétude,
  la même extensionalité et la même naturalité sous le contrat fixé.
- La relation définie par inclusion des supports n'est pas un préordre, ou son
  quotient n'est pas un ordre partiel.
- Une implication produite possède une facette témoin contenant son antécédent
  sans son conséquent.
- Une implication valide dans toutes les facettes est absente de la relation.

Un seul contre-exemple exact suffit pour renverser l'énoncé formel concerné.

### 7.2 Renversement par effet de méthode

- Deux représentations isomorphes du même complexe donnent des ordres non
  isomorphes.
- Une permutation, une duplication de présentation ou une sérialisation
  équivalente modifie le quotient ordonné.
- Des clones extensionnels sont départagés, ou leur quotient ne restitue pas
  l'ordre initial.
- La construction exige en pratique une information non contenue dans
  l'incidence distinction–facette.

Ces observations montreraient que la méthode injecte une partie de l'objet
qu'elle prétend dériver.

### 7.3 Renversement de l'application au système

- Les facettes disponibles ne sont pas la totalité des contextes complets mais
  un échantillon dépendant du protocole.
- Deux systèmes ayant la même incidence complète exigent des implications
  différentes selon une propriété physique ou dynamique pertinente absente de
  `K`.
- La notion de contexte complet n'est pas définie par les compatibilités mais
  par un seuil ou une intervention extérieure.
- Une nouvelle observation établit que multiplicité, poids ou temporalité est
  constitutive de l'implication recherchée.

Dans ces cas, le théorème d'incidence peut rester exact, mais il ne sélectionne
plus scientifiquement la règle pertinente pour l'objet étudié.

### 7.4 Renversement de la portée scientifique

- Le principe ne produit que des relations tautologiques ou non
  discriminantes sur le domaine prospectif préenregistré.
- Son ordre ne distingue aucun monde que les compatibilités brutes ne
  distinguent déjà sous la question scientifique visée.
- Un contrôle apparié montre que la même prétention est produite lorsque le
  lien entre facettes et contextes complets est détruit.

Ces résultats n'invalideraient pas nécessairement la construction formelle,
mais retireraient sa capacité à sélectionner une règle scientifiquement utile.

## 8. Décision permise avant toute expérience

Le candidat peut être qualifié dès maintenant de **règle canonique interne au
contrat des contextes complets**, car sa relation est entièrement déterminée
par l'incidence et caractérisée par correction et complétude.

Il ne peut pas encore être qualifié de règle scientifiquement sélectionnée pour
le système étudié. Cette qualification exige d'établir indépendamment que :

1. les facettes représentent bien les contextes complets possibles ;
2. l'implication recherchée a bien la sémantique universelle déclarée ;
3. aucune variable constitutive n'est supprimée par la représentation en
   complexe non pondéré ;
4. les conditions de renversement restent accessibles à un futur protocole.

Jusqu'à cette justification indépendante, le principe fournit un candidat
formel unique, non un nouveau résultat. Le statut scientifique reste `unknown`.
