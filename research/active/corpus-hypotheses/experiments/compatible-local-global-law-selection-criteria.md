# Critères de sélection d'une loi locale–globale interne

## Statut et objectif

Spécification normative sans exécution ni nouveau résultat.

L'objectif est de distinguer, avant toute expérience :

- une loi de réalisabilité dérivée des structures du système ;
- une convention ajoutée par l'observateur pour compléter les données locales.

Les quatre familles examinées sont : flag/Helly, loi locale d'ordre `k`,
recollement et faisabilité globale. Le statut scientifique reste `unknown`.

## 1. Critère général d'internalité

Une famille de lois est un candidat interne seulement si les quatre conditions
suivantes sont satisfaites avant l'accès aux résultats :

1. **ancrage** : ses objets, paramètres et relations proviennent des lois ou
   de l'espace d'états du système ;
2. **naturalité** : les transformations qui préservent le système transportent
   la loi sans nouveau choix ;
3. **risque d'échec** : une classe de contre-exemples recevables est définie et
   détectable ;
4. **pouvoir discriminant** : il existe dans le domaine déclaré au moins une
   situation où cette famille et une concurrente admissible donnent des
   prédictions différentes.

Une famille est une convention d'observateur si un choix essentiel — ordre
local, couverture, seuil, contrainte globale ou domaine — peut varier sans
modification correspondante du système.

Une propriété vraie uniquement parce que la représentation l'impose est une
propriété du modèle construit, pas encore une loi interne du système.

## 2. Famille flag / Helly d'ordre 2

### 2.1 Données nécessaires du système

La sélection de cette famille exige :

- un espace global d'états `Ω_S` ;
- pour chaque distinction `x`, un domaine de réalisation `P_x ⊆ Ω_S` ;
- une notion uniforme de coexistence ;
- une structure interne des `P_x` impliquant que leurs intersections deux à
  deux non vides forcent une intersection globale non vide ;
- un théorème ou un certificat indépendant établissant cette propriété pour la
  classe entière considérée, pas seulement pour les exemples observés.

Le graphe des intersections ne constitue pas ce certificat. Utiliser des
cliques comme contextes puis invoquer leur réalisabilité serait circulaire.

### 2.2 Transformations obligatoires

La propriété doit être préservée sous :

- renommage des distinctions ;
- bijection de l'espace d'états préservant les ensembles `P_x` ;
- reformulation équivalente des contraintes définissant les `P_x` ;
- réénumération et changement de sérialisation ;
- ajout de variables auxiliaires éliminables sans changer les intersections ;
- remplacement du dispositif de calcul sans changement de l'espace réalisable.

Une transformation modifiant la géométrie ou la classe des ensembles peut
changer légitimement la propriété ; elle doit être déclarée comme changement
de système ou de modèle.

### 2.3 Contre-exemple réfutant

La famille est réfutée sur le domaine par un ensemble `A`, de taille au moins
trois, tel que :

```text
P_x ∩ P_y ≠ ∅ pour chaque paire {x,y} ⊆ A,
mais intersection_{x∈A} P_x = ∅.
```

Chaque compatibilité et l'absence du témoin global doivent être établies dans
le même régime et avec une détectabilité suffisante.

### 2.4 Observation non discriminante

La famille est non discriminante si :

- aucun ensemble candidat ne dépasse deux distinctions ;
- tous les contextes possibles ont une taille au plus deux ;
- le domaine ne contient aucune clique d'ordre au moins trois entièrement
  qualifiée ;
- la réalisabilité globale est définie comme « être une clique » ;
- toutes les familles concurrentes préenregistrées coïncident sur le domaine ;
- l'absence de réalisation globale n'est pas détectable.

Dans ces cas, la propriété peut être formellement vraie mais ne sélectionne pas
la famille flag comme loi du système.

## 3. Famille locale d'ordre `k`

### 3.1 Données nécessaires du système

La sélection exige :

- un prédicat global `J_S` défini indépendamment ;
- les relations de réalisabilité de tous les sous-ensembles jusqu'à l'ordre
  `k` ;
- une borne interne sur l'arité des obstructions ou un théorème établissant
  qu'aucune obstruction minimale n'a une taille supérieure à `k` ;
- une valeur de `k` déterminée par une dimension, une arité d'interaction, une
  loi de conservation ou un invariant du système ;
- un certificat que `k` ne dépend ni de la taille des données ni d'une limite
  de calcul.

Le choix du plus petit `k` compatible avec des résultats observés n'est pas une
dérivation interne.

### 3.2 Transformations obligatoires

La valeur et la propriété doivent être préservées sous :

- isomorphismes du système et renommages ;
- descriptions équivalentes des mêmes contraintes ;
- permutation de l'ordre d'inspection des sous-ensembles ;
- ajout ou suppression de contraintes redondantes ;
- introduction puis élimination de variables auxiliaires qui ne modifie pas
  l'arité intrinsèque des obstructions ;
- changement d'algorithme exact.

Si une opération de grossissement ou de réduction change l'arité effective,
elle n'est neutre que si une loi de transformation de `k` a été fixée avant.

### 3.3 Contre-exemple réfutant

Pour une valeur annoncée `k`, la loi est réfutée par un ensemble `A` tel que :

```text
J_S(B) pour tout B ⊆ A avec |B| ≤ k,
mais non J_S(A).
```

Le contre-exemple doit établir les réalisations locales et l'obstruction
globale sous les mêmes contraintes.

### 3.4 Observation non discriminante

La famille est non discriminante si :

- la taille maximale du domaine ou des candidats est inférieure ou égale à
  `k` ;
- aucune configuration ne peut porter une obstruction d'ordre supérieur ;
- plusieurs valeurs de `k` donnent exactement les mêmes décisions ;
- `k` est augmenté après chaque échec, permettant d'absorber tout résultat ;
- les données d'ordre supérieur à deux sont absentes ou indétectables ;
- la valeur de `k` reproduit seulement une limite de mémoire, de capteur ou de
  durée d'observation.

Une loi dont `k` peut toujours devenir la taille du contexte ne distingue
aucun monde.

## 4. Famille de recollement

### 4.1 Données nécessaires du système

La sélection exige :

- une couverture locale dérivée de la structure du système ;
- un espace de données ou de témoins pour chaque partie ;
- des applications de restriction définies par le système ;
- une condition de cohérence sur les intersections ;
- une obstruction explicite au recollement ;
- un théorème liant l'annulation de cette obstruction à l'existence d'un
  témoin global ;
- une distinction entre existence et unicité du recollement.

La couverture ne peut pas être choisie parce qu'elle rend l'obstruction nulle
ou produit le contexte attendu.

### 4.2 Transformations obligatoires

La propriété doit être transportée sous :

- isomorphismes des parties locales et de leurs intersections ;
- changement de coordonnées ou de jauge préservant les données recollées ;
- raffinement d'une couverture qui conserve le même objet global ;
- coarsening autorisé lorsque le théorème garantit l'équivalence ;
- remplacement de représentants d'une même classe d'obstruction ;
- permutation de l'ordre de recollement ;
- reformulation équivalente des applications de restriction.

Si deux couvertures admissibles du même système donnent des verdicts
incompatibles sans loi de comparaison, le choix de couverture reste externe.

### 4.3 Contre-exemple réfutant

La famille est réfutée si :

- toutes les conditions locales et de cohérence annoncées sont satisfaites,
  l'obstruction déclarée s'annule, mais aucun témoin global n'existe ; ou
- un témoin global existe alors que le critère déclare une obstruction
  nécessaire non nulle ; ou
- deux couvertures équivalentes produisent des décisions incompatibles.

### 4.4 Observation non discriminante

La famille est non discriminante si :

- la couverture contient une seule partie égale au système global ;
- les intersections sont toujours vides ou triviales ;
- l'obstruction est identiquement nulle par construction ;
- la donnée globale recherchée est déjà incluse dans chaque donnée locale ;
- la couverture est modifiée jusqu'à obtenir le verdict souhaité ;
- toutes les familles de recollement admissibles produisent le même résultat
  sur le domaine déclaré ;
- aucun cas avec données locales cohérentes mais recollement potentiellement
  obstrué n'est accessible.

Un recollement qui reçoit la solution globale en entrée ne démontre aucun
passage local–global.

## 5. Famille de faisabilité globale

### 5.1 Données nécessaires du système

La sélection exige :

- un espace d'états et des variables définis indépendamment des contextes ;
- des équations, inégalités, conservations ou budgets dérivés des lois de `S` ;
- des conditions de frontière et ressources fixées avant calcul ;
- une condition nécessaire et suffisante de faisabilité, ou des bornes
  explicitement séparées si cette équivalence n'est pas disponible ;
- des certificats de solution et, si l'impossibilité est affirmée, des
  certificats d'infaisabilité ;
- une projection déclarée reliant les solutions globales aux distinctions
  locales.

Une table listant directement les contextes acceptés n'est pas une loi de
faisabilité indépendante.

### 5.2 Transformations obligatoires

La décision doit être préservée sous :

- changement inversible de coordonnées ;
- reformulation algébrique équivalente ;
- élimination exacte de variables auxiliaires ;
- ajout de contraintes logiquement redondantes ;
- permutation des variables et contraintes ;
- remplacement du solveur par un autre procédé exact ;
- transport des conditions de frontière avec l'isomorphisme du système.

Une modification réelle des ressources ou frontières peut changer la
faisabilité et n'est pas une transformation neutre.

### 5.3 Contre-exemple réfutant

La famille est réfutée si :

- elle accepte une famille pour laquelle aucun état admissible ne satisfait
  les contraintes ;
- elle rejette une famille accompagnée d'un témoin global valide ;
- deux formulations mathématiquement équivalentes donnent des verdicts
  différents ;
- la projection d'une solution globale vers les distinctions ne correspond
  pas au contexte déclaré.

### 5.4 Observation non discriminante

La famille est non discriminante si :

- la contrainte globale est toujours vraie ou toujours fausse sur le domaine ;
- elle est une recopie de la liste des contextes à expliquer ;
- ses paramètres libres peuvent être ajustés pour accepter n'importe quelle
  famille ;
- elle utilise la classification ou le résultat comme entrée ;
- aucun cas n'oppose ses prédictions à celles d'une règle locale concurrente ;
- la faisabilité n'est observable qu'au moyen du même critère qui la définit.

## 6. Marqueurs d'une convention d'observateur

Indépendamment de la famille, la loi doit être classée comme convention ou
`unknown` si l'un des éléments suivants est nécessaire :

- seuil, ordre `k`, couverture ou budget choisi après observation ;
- définition de la réalisabilité par la sortie même de la règle ;
- substitution de « non observé » par « impossible » ;
- fenêtre, granularité ou frontière sans origine dans le système ;
- changement de famille après connaissance d'un contre-exemple ;
- paramètre permettant d'absorber toute configuration ;
- test utilisant exactement les mêmes hypothèses que la construction ;
- invariance seulement sous les transformations choisies parce qu'elles
  préservent le résultat ;
- absence de monde où la famille pourrait perdre face à une concurrente.

## 7. Critère de sélection indépendant

Une famille peut être sélectionnée avant expérience uniquement par un
**certificat de dérivation interne** contenant :

1. les primitives du système et leur provenance ;
2. la famille de loi annoncée ;
3. le théorème, invariant ou mécanisme qui l'impose ;
4. tous ses paramètres, avec leur dérivation depuis le système ;
5. les transformations neutres obligatoires ;
6. une classe non vide de contre-exemples détectables ;
7. au moins une prédiction qui diffère d'une famille concurrente admissible ;
8. une condition de non-discrimination fixée avant résultat ;
9. l'interdiction de modifier la famille après accès aux sorties.

La sélection ne repose donc ni sur la simplicité ni sur la performance
observée. Elle repose sur l'existence, avant résultat, d'une dérivation depuis
les primitives du système et d'un contraste accessible avec une concurrente.

Si plusieurs familles possèdent des certificats valides et font les mêmes
prédictions sur le domaine, aucune n'est scientifiquement sélectionnée. Leur
équivalence locale doit être conservée et le statut reste `unknown`.

## 8. Tableau de décision préalable

| Famille | Ancrage interne minimal | Réfutation caractéristique | Non-discrimination caractéristique |
|---|---|---|---|
| Flag/Helly | structure des domaines `P_x` imposant Helly-2 | clique qualifiée sans témoin global | aucun candidat d'ordre ≥ 3 |
| Locale `k` | borne intrinsèque d'arité des obstructions | toutes les parties ≤ `k` réalisables, ensemble global impossible | taille du domaine ≤ `k` ou plusieurs `k` équivalents |
| Recollement | couverture, restrictions et obstruction propres au système | obstruction nulle sans témoin global | couverture triviale ou solution globale injectée |
| Faisabilité globale | lois et certificats globaux indépendants | faux positif ou faux négatif certifié | contrainte constante, circulaire ou ajustable |

## Verdict

Aucune famille ne peut être choisie simplement parce qu'elle complète les
compatibilités locales ou reproduit des contextes attendus. Elle doit être
imposée par un certificat antérieur dérivé des structures du système, survivre
à ses transformations neutres, pouvoir perdre sur un contre-exemple détectable
et différer d'une concurrente dans au moins un cas accessible.

Aucun certificat indépendant n'est actuellement établi pour l'une des quatre
familles. Le statut scientifique demeure `unknown`.
