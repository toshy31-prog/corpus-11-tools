# Audit d'internalité des contextes compatibles complets

## Statut et objet

Audit théorique sans exécution ni nouveau résultat expérimental.

Question centrale : la famille des contextes compatibles complets est-elle
dérivée du système ou introduite par la définition du modèle ?

Cet audit porte sur le préalable du principe
`x ≼ y ⇔ Supp(x) ⊆ Supp(y)`. Il ne modifie ni ce principe formel ni le statut
`unknown` de `compatible-rule-family-001`.

## 1. Quatre niveaux à distinguer

L'expression « contexte complet » peut désigner quatre objets différents :

1. **état ou possibilité du système** : ce qui peut être conjointement réalisé ;
2. **relation de compatibilité** : le prédicat qui reconnaît les ensembles
   conjointement réalisables ;
3. **complétion mathématique** : l'extraction des ensembles maximaux pour ce
   prédicat ;
4. **contexte observé** : ce qu'un dispositif a effectivement échantillonné,
   regroupé ou rendu accessible.

Le niveau 3 est déterminé par le niveau 2. Cela ne prouve pas que le niveau 2
est une structure du système, ni que le niveau 4 l'observe exhaustivement.

## 2. Définition d'une famille interne

Soit un système fini `S`, un ensemble de distinctions `D(S)` et un prédicat de
réalisabilité conjointe `J_S(A)` pour les sous-ensembles finis `A ⊆ D(S)`.

La famille candidate est :

```text
C(S) = { A ⊆ D(S) |
         J_S(A) et, pour tout x ∉ A, non J_S(A ∪ {x}) }.
```

`C(S)` est interne au système seulement si `J_S` et la frontière de `S` sont
déterminés indépendamment de l'observateur. La maximalité est alors calculée,
pas choisie.

## 3. Conditions nécessaires d'internalité

### 3.1 Réalisabilité constitutive

`J_S(A)` doit exprimer une possibilité ou une contrainte du système : état
accessible, solution admissible, configuration stable ou coexistence permise
par ses lois déclarées. Il ne doit pas signifier seulement « éléments mesurés
ensemble » ou « éléments placés dans le même lot ».

### 3.2 Frontière antérieure

Le système, ses distinctions et son environnement pertinent doivent être
délimités avant la construction des contextes. Changer la frontière peut
changer légitimement la maximalité ; une frontière choisie après résultat rend
la famille dépendante de la méthode.

### 3.3 Maximalité intrinsèque

Un contexte est complet lorsqu'aucune distinction du domaine ne peut lui être
ajoutée tout en préservant `J_S`. Aucun seuil de taille, budget, horizon
temporel, capacité du capteur ou arrêt de l'algorithme ne peut remplacer cette
condition.

### 3.4 Exhaustivité relative au modèle

La famille doit contenir tous les ensembles maximaux réalisables, y compris
ceux qui sont rares, difficiles d'accès ou non observés dans un échantillon.
L'absence d'un contexte ne vaut impossibilité que si la détectabilité et la
couverture du domaine sont établies.

### 3.5 Fermeture descendante

Si `J_S(A)` est vrai, `J_S(B)` doit être vrai pour toute partie `B ⊆ A`, sauf
si le modèle déclare explicitement des effets de présence minimale. Sans cette
propriété, l'objet n'est pas un complexe simplicial et le contrat actuel ne
s'applique pas.

### 3.6 Unicité de la dérivation

À système et frontière fixés, le même `J_S` doit déterminer une unique famille
de maximaux. Aucun paramètre libre, seuil, ordre de parcours ou décision
d'expert ne doit intervenir entre `J_S` et `C(S)`.

### 3.7 Suffisance de la représentation

Toutes les variables constitutives de la réalisabilité recherchée doivent être
présentes. Si poids, multiplicité, durée, énergie, histoire ou ordre des
opérations changent `J_S`, un complexe non pondéré et atemporel n'est pas une
représentation suffisante.

## 4. Cas particulier du modèle par graphe

Dans les protocoles actuels, l'entrée primitive est un graphe simple `G` et
les contextes complets sont définis comme ses cliques maximales.

Cette construction comporte deux affirmations distinctes :

1. **affirmation mathématique** : les cliques maximales sont déterminées de
   manière unique par `G` ;
2. **affirmation sémantique** : toute famille de distinctions compatible deux
   à deux est conjointement réalisable.

La seconde est l'axiome de complétion flag :

```text
J_S(A)  ⇔  toutes les paires de A sont compatibles.
```

Cet axiome n'est pas déductible d'un graphe de compatibilités deux à deux. Des
incompatibilités d'ordre trois ou supérieur peuvent conserver toutes les
arêtes de `G` tout en retirant une réalisation conjointe.

Par conséquent, dans l'état actuel :

- la famille des cliques maximales est **dérivée formellement du graphe** ;
- son statut de famille des contextes complets du système est **introduit par
  définition**, tant que la propriété flag et l'exhaustivité de `G` ne sont pas
  établies indépendamment.

Cette conclusion est méthodologique. Elle n'est pas un résultat expérimental.

## 5. Transformations qui doivent préserver les contextes

Pour qu'une famille soit interne, les transformations suivantes doivent
préserver `C(S)` exactement ou la transporter canoniquement :

1. **Renommage** : tout isomorphisme de `S` transporte bijectivement ses
   contextes complets.
2. **Réénumération** : l'ordre des distinctions, contraintes et observations
   ne change pas la famille.
3. **Représentation équivalente** : deux descriptions donnant le même prédicat
   `J_S` ont les mêmes contextes maximaux.
4. **Ajout de contraintes redondantes** : une conséquence déjà impliquée ne
   crée ni ne supprime de contexte.
5. **Duplication documentaire** : répéter une contrainte ou une observation
   sans lui attribuer de poids ne change pas `C(S)`.
6. **Changement d'observateur** : deux observateurs ayant accès au même système
   et au même domaine de possibilités reconstruisent la même famille, dans les
   limites de détectabilité déclarées.
7. **Changement de canal neutre** : remplacer le capteur, la sérialisation ou
   l'ordre d'acquisition sans modifier `J_S` ne change pas les contextes.
8. **Extension indépendante** : ajouter un sous-système sans interaction
   transforme les contextes selon la loi de produit préenregistrée ; la
   restriction au système initial restitue sa famille.

À l'inverse, une transformation qui modifie une contrainte constitutive, la
frontière du système ou une possibilité réelle peut changer légitimement les
contextes. Cette sensibilité n'est pas un défaut d'internalité.

## 6. Critères excluant un choix d'observateur

La famille ne peut être qualifiée d'interne si l'un des éléments suivants
participe à sa définition :

- une fenêtre temporelle choisie pour regrouper les événements ;
- un seuil de fréquence, de confiance, de corrélation ou de taille ;
- la capacité maximale d'un instrument ou d'un calcul ;
- l'ordre de présentation, l'identité du capteur ou une convention d'étiquette ;
- la sélection des seuls contextes effectivement visités ;
- l'assimilation d'un contexte non détecté à un contexte impossible ;
- un arrêt lorsque le contexte paraît « assez complet » ;
- le choix des arêtes ou hyperarêtes après inspection de l'ordre dérivé ;
- la complétion automatique des triangles et cliques sans axiome flag
  indépendant ;
- la suppression de contextes rares, instables ou défavorables au résultat ;
- un changement de frontière ou de granularité motivé par la classification.

L'accord entre observateurs est nécessaire mais non suffisant : plusieurs
observateurs peuvent partager le même protocole injectant. L'indépendance
requiert que la famille soit déterminée par les contraintes du système et
qu'une variation neutre du protocole ne la modifie pas.

## 7. Hiérarchie de qualification

Une famille peut recevoir au plus l'un des statuts suivants :

1. **définie** : les contextes sont posés comme entrée du modèle ;
2. **dérivée formellement** : un prédicat fixé détermine sans ambiguïté ses
   maximaux ;
3. **interne au modèle** : le prédicat appartient aux lois explicites du modèle
   et survit aux transformations neutres ;
4. **interne au système étudié** : la correspondance entre le prédicat du
   modèle et les possibilités du système est établie indépendamment du
   protocole d'observation.

Passer d'un niveau au suivant exige une justification nouvelle. Une preuve au
niveau 2 ne valide pas automatiquement les niveaux 3 ou 4.

## 8. Conditions de renversement

### 8.1 Renversement de l'unicité formelle

Le principe est renversé si un même `J_S`, un même domaine et une même notion
de maximalité produisent deux familles distinctes sans paramètre supplémentaire.

### 8.2 Renversement de l'internalité au modèle

Il est renversé ou requalifié si :

- une transformation préservant `J_S` change `C(S)` ;
- le calcul des contextes exige une information absente de `S` ;
- un seuil ou une convention non déclarée détermine la maximalité ;
- deux représentations équivalentes du modèle produisent des familles non
  isomorphes.

### 8.3 Renversement de la complétion par graphe

Un seul ensemble de trois distinctions ou plus, compatible paire à paire mais
non conjointement réalisable, réfute l'axiome flag pour le domaine concerné.
La famille des cliques maximales ne peut alors plus être identifiée à la
famille des contextes complets.

Réciproquement, un ensemble conjointement réalisable dont une paire est absente
du graphe montre que le graphe ne représente pas correctement la compatibilité
primitive.

### 8.4 Renversement de l'exhaustivité

Le principe est requalifié si :

- un contexte présenté comme complet peut être étendu sous les mêmes
  contraintes ;
- un contexte maximal possible manque parce qu'il était inaccessible au
  protocole ;
- la famille change lorsque la couverture d'observation augmente alors que le
  système et sa frontière restent inchangés ;
- l'absence invoquée se situe sous le seuil de détectabilité déclaré.

### 8.5 Renversement par variable omise

L'application est renversée si deux situations ayant le même complexe non
pondéré ont des possibilités conjointes différentes en raison d'une variable
constitutive omise : temps, ordre, énergie, multiplicité, histoire ou état de
l'environnement.

### 8.6 Renversement scientifique

Même si la dérivation formelle reste correcte, l'internalité scientifique doit
être retirée si la famille suit les variations du dispositif plutôt que celles
du système, ou si aucun protocole ne peut distinguer contexte impossible et
contexte simplement non observé.

## 9. Verdict de l'audit

Le modèle actuel établit une dérivation formelle : un graphe détermine ses
cliques maximales. Il n'établit pas encore que ces cliques sont les contextes
compatibles complets d'un système indépendant de l'observateur.

Cette identification dépend de deux prémisses encore externes :

1. la compatibilité deux à deux suffit à la réalisabilité conjointe ;
2. le graphe contient exhaustivement les compatibilités pertinentes.

La réponse à la question centrale est donc : **dérivée dans le formalisme,
introduite par définition quant à son interprétation comme structure du
système**. Le principe d'ordre interne demeure conditionnel et son statut
scientifique reste `unknown`.
