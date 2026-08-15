# Audit de satisfaisabilité des certificats local–global

## Statut et périmètre

Audit théorique sans exécution ni consultation des résultats expérimentaux
antérieurs.

L'audit ne sélectionne aucune famille. Il demande seulement si le certificat
prévu pour chaque famille pourrait être satisfait sans circularité à partir de
données primitives d'un système.

Trois statuts sont utilisés :

- `candidate` : il existe une forme non circulaire et réfutable du certificat ;
- `insuffisante` : les données déclarées ne permettent pas de satisfaire le
  certificat ;
- `unknown` : la forme du certificat est recevable, mais les données nécessaires
  ne sont pas établies pour le système visé.

## 1. Test commun de satisfaisabilité

Un certificat est satisfaisable seulement si :

1. ses données primitives peuvent être définies sans connaître les contextes à
   expliquer ;
2. ses invariances proviennent des symétries ou équivalences du système ;
3. son contre-exemple est logiquement compatible avec le protocole d'audit et
   possède un canal de détection possible ;
4. sa prédiction diffère de celle d'au moins une autre famille sur un cas
   admissible fixé à l'avance ;
5. son domaine contient des cas où la propriété n'est ni tautologique ni
   constante ;
6. aucun paramètre essentiel ne peut être modifié après observation.

La satisfaisabilité d'un schéma ne prouve pas que le système réel possède les
données demandées.

## 2. Flag / Helly d'ordre 2

### 2.1 Données primitives nécessaires

- un espace d'états globaux `Ω_S` ;
- une famille de domaines de réalisation `P_x ⊆ Ω_S` ;
- une notion commune de coexistence ;
- une classe structurelle des `P_x` définie indépendamment des intersections
  observées ;
- un théorème interne selon lequel les intersections deux à deux non vides de
  cette classe impliquent une intersection globale non vide ;
- au moins une famille admissible de trois domaines ou plus.

Le seul graphe d'intersection est `insuffisante` : il encode la prémisse mais
pas la propriété de Helly de la classe qui autorise la conclusion.

### 2.2 Invariances potentiellement internes

- automorphismes de `Ω_S` transportant les `P_x` ;
- renommages des distinctions ;
- reformulations équivalentes des contraintes définissant les domaines ;
- changements de coordonnées préservant les intersections ;
- ajout puis élimination de variables auxiliaires sans changement de l'espace
  réalisable ;
- permutation de l'ordre d'énumération et changement de solveur exact.

Ces invariances sont internes seulement si elles sont dérivées de la structure
de `Ω_S`, et non choisies parce qu'elles préservent le verdict.

### 2.3 Contre-exemple réfutant

Une famille `A`, avec `|A| ≥ 3`, telle que :

```text
P_x ∩ P_y ≠ ∅ pour toute paire de A,
mais intersection_{x∈A} P_x = ∅.
```

Les témoins locaux et l'absence de témoin global doivent concerner le même
régime. Une simple non-observation globale ne suffit pas.

### 2.4 Prédiction distinctive

Sur un triplet dont toutes les paires sont réalisables :

- flag/Helly prédit un témoin global ;
- une loi locale d'ordre `3` ou une faisabilité globale munie d'une contrainte
  ternaire peut prédire l'absence de témoin.

Le triplet et la variable ternaire doivent être définis avant observation.

### 2.5 Cas non discriminant

- aucun candidat ne dépasse deux distinctions ;
- aucune clique d'ordre trois n'est entièrement qualifiée ;
- les contextes sont définis comme cliques ;
- toutes les familles comparées prédisent les mêmes contextes ;
- l'absence de témoin global n'est pas détectable.

### 2.6 Statut d'audit

- satisfaisabilité abstraite du certificat : `candidate` ;
- avec le seul graphe local : `insuffisante` ;
- application au système visé sans théorème Helly indépendant : `unknown`.

## 3. Loi locale d'ordre `k`

### 3.1 Données primitives nécessaires

- un prédicat global de réalisabilité `J_S` ;
- les réalisabilités de tous les sous-ensembles de taille au plus `k` ;
- une notion d'obstruction minimale ;
- une borne d'arité dérivée d'une interaction, d'une dimension, d'une loi de
  conservation ou d'un théorème du système ;
- une valeur `k` fixée sans ajustement aux contextes ;
- des candidats de taille strictement supérieure à `k`.

Un entier choisi selon la taille des données ou la capacité de calcul est
`insuffisante` comme justification interne.

### 3.2 Invariances potentiellement internes

- isomorphismes des variables et contraintes ;
- renommage et réénumération ;
- ajout ou retrait de contraintes logiquement redondantes ;
- changement d'algorithme exact ;
- introduction de variables auxiliaires accompagnée d'une preuve que l'arité
  intrinsèque des obstructions est conservée ;
- changement d'échelle uniquement si une loi de transformation de `k` est
  dérivée du système.

### 3.3 Contre-exemple réfutant

Un ensemble `A` tel que :

```text
J_S(B) pour tout B ⊆ A avec |B| ≤ k,
mais non J_S(A).
```

Il établit une obstruction minimale d'ordre supérieur à `k`.

### 3.4 Prédiction distinctive

Pour `k > 2`, choisir prospectivement un ensemble dont toutes les paires sont
réalisables mais qui contient une contrainte d'ordre au plus `k` :

- flag prédit la réalisation globale à partir des paires ;
- la loi `k` peut prédire l'impossibilité dès que l'obstruction `k`-aire est
  présente.

Pour distinguer `k` de `k+1`, il faut un candidat de taille supérieure à `k+1`
et des prédictions opposées dérivées avant calcul.

### 3.5 Cas non discriminant

- tous les candidats ont une taille au plus `k` ;
- plusieurs valeurs de `k` donnent les mêmes décisions ;
- aucune obstruction d'ordre supérieur n'est accessible ;
- `k` peut être augmenté après chaque échec ;
- les données d'ordre `k` sont elles-mêmes définies depuis le résultat global.

### 3.6 Statut d'audit

- satisfaisabilité abstraite du certificat : `candidate` ;
- avec une valeur `k` libre ou seulement calculatoire : `insuffisante` ;
- application au système sans borne d'arité interne : `unknown`.

## 4. Recollement

### 4.1 Données primitives nécessaires

- une couverture locale imposée par l'organisation du système ;
- un espace de témoins ou sections sur chaque partie ;
- des applications de restriction sur les recouvrements ;
- une notion de cohérence locale ;
- une classe d'obstruction définie sans connaître la solution globale ;
- un théorème reliant l'annulation de l'obstruction à l'existence d'une section
  globale ;
- une règle distinguant existence et unicité.

Une couverture sélectionnée pour annuler l'obstruction est `insuffisante`.

### 4.2 Invariances potentiellement internes

- isomorphismes des parties et de leurs recouvrements ;
- changements de coordonnées ou de jauge ;
- remplacement d'un représentant par un représentant équivalent de la même
  obstruction ;
- permutation de l'ordre de recollement ;
- raffinements de couverture préservant l'objet global ;
- coarsenings pour lesquels une équivalence a été démontrée ;
- reformulations naturelles des applications de restriction.

La comparaison entre couvertures doit elle-même appartenir au certificat.

### 4.3 Contre-exemple réfutant

- des sections locales satisfont toutes les cohérences annoncées et
  l'obstruction s'annule, mais aucune section globale n'existe ; ou
- une section globale valide existe alors que l'obstruction nécessaire est
  déclarée non nulle ; ou
- deux couvertures équivalentes donnent des verdicts incompatibles.

### 4.4 Prédiction distinctive

Sur des supports localement compatibles portant des données incompatibles sur
un cycle de recouvrements :

- flag, qui ne voit que les supports, prédit un contexte global ;
- le recollement prédit l'échec si son obstruction est non nulle.

Réciproquement, une obstruction nulle peut prédire un témoin global sans
supposer la propriété flag pour toutes les familles de supports.

### 4.5 Cas non discriminant

- la couverture possède une seule partie globale ;
- les recouvrements sont vides ou toujours triviaux ;
- l'obstruction est identiquement nulle ;
- la solution globale est incluse dans les données locales ;
- la couverture est librement modifiable ;
- aucun cycle ou autre support d'obstruction n'existe dans le domaine.

### 4.6 Statut d'audit

- satisfaisabilité abstraite du certificat : `candidate` ;
- avec une couverture libre ou la solution globale injectée : `insuffisante` ;
- application au système sans structure locale et restrictions intrinsèques :
  `unknown`.

## 5. Loi globale de faisabilité

### 5.1 Données primitives nécessaires

- un espace d'états et des variables du système ;
- des équations, inégalités, conservations ou budgets dérivés indépendamment ;
- des conditions de frontière, ressources et environnement ;
- une projection des états globaux vers les distinctions ;
- une condition nécessaire et suffisante de faisabilité, ou une séparation
  explicite entre conditions nécessaires et suffisantes ;
- des certificats de solution et d'infaisabilité.

Une table des contextes acceptés ou un oracle construit depuis les sorties est
`insuffisante` comme loi.

### 5.2 Invariances potentiellement internes

- changements inversibles de coordonnées ;
- reformulations algébriques équivalentes ;
- permutation des variables et contraintes ;
- ajout de contraintes redondantes ;
- élimination exacte de variables auxiliaires ;
- changement de solveur exact ;
- transport des conditions de frontière sous isomorphisme du système.

Les changements réels de ressources ou de frontière ne sont pas neutres.

### 5.3 Contre-exemple réfutant

- un contexte est déclaré faisable sans aucun état satisfaisant les
  contraintes ;
- un témoin global valide est rejeté ;
- deux formulations équivalentes donnent des verdicts différents ;
- la projection du témoin ne produit pas le contexte annoncé.

### 5.4 Prédiction distinctive

Considérer prospectivement deux systèmes ayant les mêmes compatibilités locales
mais des valeurs différentes d'une quantité globale conservée ou d'un budget :

- les familles purement locales donnent la même prédiction ;
- la loi de faisabilité peut accepter l'un et rejeter l'autre.

La quantité globale doit être une primitive du système, non un paramètre ajusté
pour créer le contraste.

### 5.5 Cas non discriminant

- la contrainte est toujours satisfaite ou jamais satisfaite ;
- elle recopie les contextes connus ;
- ses paramètres acceptent arbitrairement toute sortie ;
- les données globales contiennent déjà la classification ;
- aucune paire de systèmes localement identiques mais globalement distincts
  n'est admissible ;
- le seul test de faisabilité est la loi elle-même.

### 5.6 Statut d'audit

- satisfaisabilité abstraite du certificat : `candidate` ;
- avec une contrainte circulaire, constante ou ajustable : `insuffisante` ;
- application au système sans loi globale indépendante : `unknown`.

## 6. Comparaison sans sélection

| Famille | Certificat abstrait | Données locales seules | Application actuelle |
|---|---|---|---|
| Flag/Helly | `candidate` | `insuffisante` | `unknown` |
| Locale `k` | `candidate` | `insuffisante` | `unknown` |
| Recollement | `candidate` | `insuffisante` | `unknown` |
| Faisabilité globale | `candidate` | `insuffisante` | `unknown` |

Cette égalité de statut n'indique pas que les familles sont équivalentes. Elle
indique seulement que chacune possède une forme de certificat cohérente, mais
qu'aucune n'est instanciée par les seules données abstraites actuellement
déclarées.

## 7. Porte de passage vers une préinscription

Une famille pourra passer de `unknown` à `candidate` pour un système déterminé
uniquement si un dossier antérieur aux résultats fournit :

1. toutes ses données primitives ;
2. la provenance interne de chaque paramètre ;
3. les transformations neutres et leur justification ;
4. un contre-exemple détectable ;
5. une prédiction opposée à une concurrente sur un cas non vacuole ;
6. un test explicite de non-discrimination ;
7. une interdiction de remplacer les relations inconnues par des
   incompatibilités.

L'absence d'un seul de ces éléments maintient `unknown` ou rend le certificat
`insuffisante`, selon que la donnée manque ou que la construction est
circulaire.

## Verdict

Les quatre familles possèdent des certificats abstraitement satisfaisables et
restent donc des `candidate` formelles. Les compatibilités locales seules sont
`insuffisante` pour les quatre. Faute de primitives propres à un système,
d'invariances dérivées et de contrastes détectables instanciés, leur statut
scientifique demeure `unknown`.

Aucun gagnant n'est sélectionné.
