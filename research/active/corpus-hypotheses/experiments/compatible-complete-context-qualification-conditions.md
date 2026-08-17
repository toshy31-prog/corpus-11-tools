# Conditions de qualification des contextes compatibles complets

## Statut

Spécification normative sans exécution ni résultat expérimental.

Elle sépare :

- la construction mathématique d'une famille de contextes ;
- la justification indépendante que cette famille appartient au système.

Tant qu'aucune justification indépendante ne satisfait les conditions
ci-dessous, le statut reste `unknown`.

## 1. Objets et niveaux de preuve

Soient :

- `S`, le système et sa frontière préalablement fixée ;
- `D(S)`, les distinctions pertinentes ;
- `J_S(A)`, l'énoncé « les éléments de `A ⊆ D(S)` sont conjointement
  réalisables dans `S` » ;
- `G_S`, le graphe dont une arête `xy` signifie `J_S({x,y})` ;
- `C(S)`, la famille des ensembles maximaux satisfaisant `J_S`.

Trois niveaux doivent rester distincts :

1. **Construction** : une entrée mathématique donnée produit une famille de
   maximaux.
2. **Internalité au modèle** : les lois du modèle déterminent l'entrée et la
   famille sans choix supplémentaire.
3. **Internalité au système** : la correspondance entre les lois du modèle et
   les possibilités de `S` est établie par un critère indépendant du découpage
   de l'observateur.

Un calcul exact au niveau 1 ne constitue pas une preuve des niveaux 2 ou 3.

## 2. Réalisabilité globale

### 2.1 Problème local–global

Les compatibilités locales garantissent un contexte conjoint uniquement si un
principe local–global est fixé indépendamment. Pour une famille `A`, connaître
tous les énoncés `J_S(B)` sur de petites parties `B ⊂ A` ne suffit pas en
général à établir `J_S(A)`.

Une qualification interne doit emprunter exactement l'une des voies suivantes.

### 2.2 Voie A — réalisabilité globale primitive

`J_S(A)` est défini directement par les lois du système : existence d'un état,
d'une solution ou d'une configuration globale satisfaisant simultanément les
contraintes portées par `A`.

Conditions nécessaires :

- le domaine des états globaux est fixé avant l'examen des contextes ;
- la satisfaction est décidée sans seuil choisi par l'observateur ;
- les mêmes lois traitent tous les sous-ensembles du domaine ;
- un témoin ou un certificat indépendant peut distinguer réalisation et
  impossibilité dans le modèle.

Dans cette voie, le graphe est une projection de `J_S`, pas sa définition.

### 2.3 Voie B — théorème de recollement

Les compatibilités locales peuvent suffire si les lois de `S` impliquent un
théorème de recollement : toute famille de réalisations locales cohérentes sur
leurs recouvrements possède une réalisation globale.

Le contrat doit alors fixer avant résultat :

- la couverture locale admise ;
- les données portées par chaque partie ;
- les applications de restriction ;
- la notion exacte de cohérence sur les intersections ;
- l'obstruction dont l'annulation garantit le recollement ;
- l'existence, et séparément l'éventuelle unicité, de la réalisation globale.

La simple compatibilité de chaque paire ne remplace pas la cohérence de toutes
les données de recouvrement.

### 2.4 Voie C — propriété flag justifiée

Pour dériver les contextes depuis un graphe simple, il faut établir :

```text
J_S(A) ⇔ pour toutes paires {x,y} ⊆ A, J_S({x,y}).
```

Cette propriété peut appartenir à une classe de systèmes si elle découle de
leurs lois ou d'un théorème indépendant. Elle ne peut pas être justifiée par le
fait que l'on a choisi les cliques comme contextes.

Un seul obstacle d'ordre trois ou supérieur compatible sur toutes ses paires
rend cette voie invalide pour le domaine concerné.

### 2.5 Conditions transversales

Quelle que soit la voie retenue :

- la réalisabilité doit être simultanée au sens fixé, pas seulement successive ;
- la frontière, l'environnement et les ressources disponibles doivent être
  déclarés ;
- les variables qui modifient la coexistence — temps, énergie, ordre, charge,
  histoire — doivent être intégrées ou explicitement démontrées non
  pertinentes ;
- la fermeture descendante doit être établie si l'objet est traité comme un
  complexe simplicial ;
- la maximalité doit signifier « aucune extension réalisable dans `D(S)` », et
  non « aucune extension observée ».

## 3. Complétude du graphe

### 3.1 Contrat d'arête

Chaque arête doit satisfaire les deux directions suivantes :

```text
correction :  xy ∈ E(G_S)  ⇒  J_S({x,y})
complétude :  J_S({x,y})   ⇒  xy ∈ E(G_S).
```

La première interdit les faux liens. La seconde interdit les compatibilités
omises. Un graphe seulement observé ne satisfait pas la seconde par défaut.

### 3.2 Principes admissibles de complétude

La prétention « toutes les compatibilités pertinentes sont représentées » doit
être fondée sur au moins un certificat indépendant :

1. **Énumération finie exhaustive** : chaque paire du domaine fixé reçoit une
   décision selon le même prédicat.
2. **Dérivation analytique** : les lois de `S` fournissent une condition
   nécessaire et suffisante d'adjacence.
3. **Générateur complet** : une procédure prouvée complète énumère toutes les
   compatibilités et possède un critère d'arrêt indépendant du résultat.
4. **Couverture expérimentale calibrée** : chaque paire est testable dans une
   fenêtre, à un seuil et sous un bruit connus, avec contrôles positifs et
   négatifs capables d'établir la détectabilité.

Les trois premières voies peuvent établir la complétude dans un modèle. La
quatrième peut soutenir une attribution au système, mais une non-détection ne
devient une incompatibilité que si la puissance de détection est suffisante
pour cette paire précise.

### 3.3 États des arêtes

Une construction empirique doit autoriser au moins trois états :

```text
présente | absente avec détectabilité établie | inconnue
```

Une arête `inconnue` interdit de qualifier le graphe de complet. La convertir
automatiquement en non-arête fermerait artificiellement les contextes.

### 3.4 Pertinence du domaine

La complétude est toujours relative à :

- une liste fermée de distinctions ;
- une échelle et une granularité ;
- un environnement et des ressources ;
- une fenêtre de validité ;
- une notion de coexistence.

Ces éléments doivent être fixés avant la construction. Un graphe exhaustif sur
un domaine arbitrairement tronqué n'établit pas la complétude du système.

## 4. Indépendance de l'observateur

### 4.1 Transformations neutres obligatoires

À système, frontière et prédicat `J_S` inchangés, la famille des contextes doit
être préservée exactement ou transportée canoniquement sous :

1. renommage bijectif des distinctions ;
2. permutation de leur ordre d'énumération ;
3. changement de sérialisation ou de format ;
4. ajout ou retrait de contraintes logiquement redondantes ;
5. duplication documentaire sans pondération ;
6. remplacement d'un algorithme exact par un autre calculant le même `J_S` ;
7. raffinement d'une couverture locale qui conserve le même espace de
   solutions globales ;
8. changement de capteur ou de canal ayant une détectabilité équivalente ;
9. permutation de l'ordre d'acquisition lorsque la coexistence est déclarée
   atemporelle ;
10. changement d'observateur sans changement d'accès ni de pouvoir
    d'intervention.

Une divergence sous l'une de ces transformations indique un effet de méthode,
une différence de détectabilité ou une variable constitutive omise.

### 4.2 Transformations non neutres

Les contextes peuvent changer légitimement si la transformation modifie :

- la frontière du système ;
- les contraintes ou ressources disponibles ;
- l'environnement pertinent ;
- le domaine des distinctions ;
- une variable constitutive de la coexistence ;
- le prédicat de réalisabilité lui-même.

Ces changements doivent être enregistrés comme changements de système, pas
présentés comme tests d'invariance.

### 4.3 Choix externes interdits

Ne peuvent participer à la définition des contextes :

- seuil de corrélation, fréquence ou confiance choisi après observation ;
- taille maximale imposée par le calcul ou l'instrument ;
- fenêtre temporelle non dérivée d'une échelle propre du système ;
- regroupement décidé par proximité dans le fichier ou la collecte ;
- sélection des seules configurations visitées ou publiées ;
- suppression des contextes rares ou coûteux à détecter ;
- ordre des commandes, identité du testeur ou convention d'étiquette ;
- arrêt lorsque la famille semble stable ou produit l'ordre recherché ;
- changement de frontière, résolution ou variables après classification ;
- complétion en cliques sans justification indépendante de la propriété flag ;
- assimilation de `non observé` à `impossible` sans audit de détectabilité.

### 4.4 Contrôle du pouvoir d'observation

L'indépendance ne signifie pas absence d'instrument. Elle exige que le rôle de
l'instrument soit borné :

- ce qu'il peut détecter est déclaré par paire et par contexte ;
- ses seuils, bruit, fenêtres et perturbations sont connus ;
- les contextes qu'il rend structurellement inaccessibles restent `unknown` ;
- son intervention ne crée pas la compatibilité qu'elle prétend mesurer ;
- plusieurs canaux indépendants ne sont probants que s'ils ne partagent pas le
  même mécanisme de sélection.

## 5. Porte de qualification

Un contexte complet peut être qualifié de structure interne du système
seulement si toutes les conditions suivantes sont satisfaites :

1. `J_S` possède une définition indépendante du contexte obtenu ;
2. une voie valide relie les compatibilités locales à la réalisabilité globale ;
3. le domaine et la frontière du système sont fixés antérieurement ;
4. le graphe est correct et complet relativement à ce domaine ;
5. les inconnues de détectabilité ne sont pas converties en incompatibilités ;
6. la maximalité résulte uniquement de `J_S` ;
7. les transformations neutres préservent la famille ;
8. aucune variable constitutive n'est omise ;
9. aucune décision de l'observateur ne participe au contenu de la famille.

Ces conditions sont conjointement nécessaires. Leur inscription dans un
document ne prouve pas qu'elles sont remplies.

## 6. Séparation des conclusions permises

| Énoncé | Justification requise | Statut actuel |
|---|---|---|
| Les cliques maximales de `G` sont calculables | Définition du graphe | établi formellement |
| Les cliques maximales représentent tous les contextes du modèle | Propriété flag et graphe complet dans le modèle | `unknown` |
| Les contextes du modèle appartiennent au système | Correspondance indépendante, détectabilité et invariance observateur | `unknown` |
| L'ordre dérivé est une structure interne du système | Toutes les étapes précédentes plus le contrat d'implication | `unknown` |

## Verdict

La construction mathématique est séparée de sa justification : extraire les
cliques maximales d'un graphe est canonique, mais ne démontre ni la
réalisabilité globale ni la complétude des compatibilités ni l'indépendance de
l'observateur.

En l'absence d'un prédicat global primitif, d'un théorème de recollement ou
d'une propriété flag établie indépendamment, puis d'un certificat de complétude
du graphe, les contextes restent internes au formalisme seulement par
définition. Le statut scientifique demeure `unknown`.
