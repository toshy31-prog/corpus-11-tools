# Spécification d'admissibilité des règles de dérivation

## Statut et portée

Ce document est une spécification normative préparatoire. Il ne définit aucune
nouvelle règle, ne lance aucune expérience et ne produit aucun résultat.

Le point de départ accepté est le suivant :

- un noyau commun entre plusieurs règles a été observé ;
- aucune règle n'est scientifiquement sélectionnée ;
- la classification de `compatible-rule-family-001` reste `unknown`.

L'objectif est de déterminer, avant tout nouveau calcul, les conditions sous
lesquelles une règle de dérivation pourrait être sélectionnée sans utiliser ses
résultats comme critère de choix.

## Séparations obligatoires

Trois décisions ne doivent jamais être confondues :

1. **Admissibilité** : la règle respecte le contrat sémantique, les invariances
   et les restrictions d'accès fixés avant résultat.
2. **Sélection opérationnelle** : une règle est choisie de manière déterministe
   pour permettre une exécution. Ce choix peut être conventionnel.
3. **Sélection scientifique** : une règle est imposée par une justification
   indépendante des résultats, ou est l'unique minimum d'un langage et d'un
   ordre de simplicité préenregistrés, sans concurrent ex aequo portant la même
   prétention sémantique.

Un bon score, une forte stabilité observée, un grand nombre de relations, un
avantage prédictif ou la réussite face à un contrôle ne peuvent rendre une
règle admissible ou justifier rétroactivement sa sélection.

## 1. Contrat sémantique préalable

Toute règle candidate doit être une compilation explicite d'un même contrat
sémantique, écrit avant la définition de la famille de règles. Ce contrat doit
préciser :

- le domaine fini auquel la règle s'applique ;
- les objets d'entrée autorisés ;
- la signification indépendante attribuée à une relation dérivée ;
- les sorties permises ;
- les cas où aucune relation stricte doit être produite ;
- les informations auxquelles la règle n'a pas accès.

Une règle qui répond à une autre question sémantique n'est pas une variante
admissible : elle appartient à une autre famille expérimentale.

## 2. Invariances exigées

Les invariances suivantes sont des conditions d'admissibilité exactes :

### 2.1 Équivariance par renommage

Renommer bijectivement les distinctions avant dérivation doit produire le
renommage bijectif du résultat obtenu avant transformation. La règle ne peut
donc dépendre des noms, indices ou identifiants des sommets.

### 2.2 Indépendance de l'énumération

L'ordre de présentation des sommets, contextes, arêtes ou éléments d'un
contexte ne doit pas modifier la relation dérivée.

### 2.3 Invariance de représentation

Deux sérialisations canoniquement équivalentes du même objet doivent produire
la même sortie. Les doublons de présentation et les contextes redondants que le
contrat déclare sans portée sémantique ne doivent pas modifier le résultat.

### 2.4 Transport cohérent

Dériver puis transporter le résultat doit être identique à transporter les
entrées puis dériver. Cette condition doit être formulée sur les morphismes
admis par le contrat, et pas seulement sur un exemple.

### 2.5 Absence d'accès extrinsèque

La règle ne peut lire ni graine aléatoire, ni masque d'énumération, ni indice de
graphe, ni fichier de résultat, ni classification, ni nom d'expérience. Elle
doit être totale et déterministe sur son domaine déclaré.

### 2.6 Extensions non pertinentes

Lorsque le contrat déclare une extension sans interaction comme non
pertinente, son ajout ne doit pas changer les relations entre les distinctions
initiales. De même, dupliquer un objet extensionnellement indiscernable ne doit
pas réordonner des objets sans rapport.

Ces exigences ne demandent pas l'invariance sous une modification réelle du
modèle. Ajouter une compatibilité ou changer un contexte peut légitimement
changer le résultat ; cela doit être traité comme une perturbation du système,
non comme un changement de représentation.

## 3. Simplicité fixée avant résultat

La simplicité doit être mesurée dans un langage canonique versionné et gelé
avant toute exécution. Ce langage doit énumérer ses primitives autorisées et
leur coût, par exemple :

- accès aux contextes maximaux et à l'appartenance ;
- égalité et inclusion ensemblistes ;
- filtrage par un prédicat déclaré ;
- quantification universelle ou existentielle ;
- quotient par une équivalence autorisée.

Toute primitive externe au contrat, tout accès à un résultat et tout paramètre
numérique libre rendent la règle inadmissible. Les constantes nécessaires au
contrat doivent être déclarées et justifiées avant la famille de règles.

Après le filtre d'admissibilité, les règles sont comparées selon le tuple
lexicographique préenregistré suivant :

1. nombre de paramètres libres ;
2. nombre de primitives sémantiques distinctes ;
3. nombre d'opérations de sélection ou de filtrage ;
4. profondeur de quantification ;
5. longueur de description dans la grammaire canonique.

Le barème, l'ordre du tuple, la normalisation de la syntaxe et la version du
langage doivent être figés ensemble. Ils ne peuvent pas être ajustés pour
favoriser une règle après observation.

Un départage lexical peut assurer une exécution déterministe entre règles ex
aequo. Il constitue uniquement une sélection opérationnelle, jamais une
sélection scientifique.

## 4. Stabilité attendue

Une règle admissible doit annoncer avant résultat les stabilités qu'elle
revendique :

- stabilité exacte sous toutes les invariances de représentation ;
- portabilité aux tailles ou familles de modèles fixées à l'avance ;
- comportement attendu lors des extensions non pertinentes ;
- comportement attendu, ou statut explicitement inconnu, sous chaque
  perturbation réelle préenregistrée.

La stabilité commune de plusieurs règles peut établir un noyau robuste de la
famille. Elle ne permet pas de choisir l'une d'elles. Toute sortie extérieure à
ce noyau reste dépendante de la convention tant qu'une justification
indépendante ne la distingue pas.

## 5. Contrôles négatifs préenregistrés

Les contrôles suivants doivent être définis avant toute exécution ultérieure :

1. **Renommage adversarial** : une règle utilisant les étiquettes doit échouer.
2. **Permutation de présentation** : toute variation due à l'ordre des entrées
   doit entraîner le rejet.
3. **Sérialisation équivalente** : des formes différentes du même objet doivent
   produire une sortie identique.
4. **Fuite de résultat** : modifier les résultats, classifications ou noms de
   fichiers disponibles ne doit jamais modifier la règle ni sa sélection.
5. **Identifiant extrinsèque** : une dépendance au masque, à l'index du graphe
   ou à la graine doit entraîner le rejet.
6. **Symétrie nulle** : lorsque toutes les distinctions sont sémantiquement
   symétriques, aucune relation stricte ne doit être créée sans justification
   préalable explicite.
7. **Dégénérescence** : les règles toujours vides ou toujours complètes ne sont
   pas informatives, même si elles satisfont certaines invariances.
8. **Paramètre postérieur** : tout seuil ou coefficient choisi après inspection
   d'une sortie rend la sélection invalide.
9. **Règles aléatoires appariées** : un noyau de stabilité doit être comparé à
   des règles nulles appariées selon les caractéristiques fixées avant calcul.

Ces contrôles sont des portes de validation futures. Le présent document ne les
exécute pas.

## 6. Décision de sélection

Une règle ne devient scientifiquement sélectionnable sans résultat que si les
conditions suivantes sont toutes satisfaites :

1. elle respecte le contrat sémantique et toutes les invariances exigées ;
2. elle passe les contrôles négatifs préenregistrés ;
3. elle ne contient aucun paramètre libre ni accès extrinsèque ;
4. elle est soit imposée par le contrat sémantique ou un résultat formel
   indépendant, soit l'unique minimum du langage de simplicité préenregistré ;
5. aucune règle ex aequo ne porte la même prétention sémantique ;
6. la décision, la grammaire, les coûts et la politique d'égalité sont verrouillés
   avant l'accès aux résultats.

Une règle uniquement minimale selon une convention de description est
**sélectionnable opérationnellement**. Elle n'est **scientifiquement
sélectionnée** que si la pertinence de cette convention possède elle-même une
justification extérieure aux résultats.

Si plusieurs règles restent admissibles sans fondement indépendant permettant
de les départager, la décision scientifique demeure `unknown`. La famille et
son éventuel noyau commun doivent alors être conservés comme objet d'étude.

Un résultat futur favorable à une règle constituerait une preuve prospective
de performance sous un protocole donné. Il ne pourrait pas réécrire son
admissibilité ni justifier rétroactivement son choix.

## 7. Contenu minimal d'un futur verrou

Avant toute nouvelle exécution, un manifeste d'admissibilité devra figer :

- le contrat sémantique ;
- le domaine et les entrées interdites ;
- la version et l'empreinte de la grammaire canonique ;
- les primitives et leur barème ;
- les invariances exigées ;
- les revendications de stabilité ;
- les contrôles négatifs ;
- l'ordre de sélection et la politique d'égalité ;
- les conditions qui annulent l'admissibilité ou la sélection.

La rédaction de ce manifeste constituera une étape séparée. Aucune règle ne
devra être ajoutée et aucun calcul ne devra commencer avant son verrouillage.

## Verdict préparatoire

Cette spécification rend une règle sélectionnable sans utiliser le résultat
uniquement lorsqu'une justification sémantique ou formelle antérieure la rend
unique parmi les règles admissibles. La simplicité conventionnelle peut régler
une exécution, mais ne suffit pas à établir une sélection scientifique. En
l'absence d'unicité justifiée, le statut correct reste `unknown`.
