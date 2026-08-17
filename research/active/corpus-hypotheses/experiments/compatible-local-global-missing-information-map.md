# Carte des informations manquantes entre compatibilités locales et globales

## Statut et périmètre

Cartographie théorique sans expérience, sans ajout de famille et sans choix de
mécanisme.

Le point de départ est uniquement la donnée locale d'ordre deux :

```text
L_2(S) = { A ⊆ D(S) | |A| ≤ 2 et J_S(A) }.
```

La sous-détermination formelle montre que `L_2(S)` ne fixe pas `J_S(A)` pour
`|A| ≥ 3`. La présente carte décrit ce que différents ajouts apporteraient et
le reste qu'ils laisseraient indécidable. Le statut scientifique reste
inchangé : `unknown`.

## 1. Deux sens du minimum

Le minimum dépend de la question posée.

### 1.1 Décider un ensemble particulier

Pour un ensemble candidat `A` :

- un témoin global commun valide suffit à établir `J_S(A) = vrai` ;
- une obstruction nécessaire certifiée, ou une preuve exhaustive d'absence de
  témoin, suffit à établir `J_S(A) = faux` ;
- l'absence d'observation ne fournit aucun de ces deux certificats.

Le minimum est donc asymétrique : un témoin positif peut être ponctuel, tandis
qu'une conclusion négative exige une obstruction ou une couverture complète
du domaine des témoins.

### 1.2 Reconstruire tous les contextes

Pour un domaine fini `D`, il faut connaître `J_S(A)` pour tous les ensembles
pertinents, ou disposer d'une représentation équivalente prouvée complète qui
permette de calculer ces valeurs sans perte.

Une règle de composition, un recollement ou une dynamique n'élimine pas cette
information : il la représente ou la compresse sous des hypothèses
supplémentaires qui doivent elles-mêmes être justifiées.

## 2. Ajout : compatibilités d'ordre supérieur

### 2.1 Information nouvelle

Ajouter les valeurs :

```text
J_S(A) pour 3 ≤ |A| ≤ r,
```

avec trois états possibles lorsque la qualification est empirique :

```text
réalisable | irréalisable avec certificat | inconnue.
```

Cette information peut être stockée comme hyperarêtes réalisables, obstructions
minimales ou table de réalisabilité jusqu'à l'ordre `r`.

### 2.2 Ce qu'elle permet de décider

- la réalisabilité de chaque ensemble qualifié de taille au plus `r` ;
- les obstructions minimales d'ordre au plus `r` ;
- les contextes maximaux au sein d'un sous-domaine dont toutes les extensions
  pertinentes sont qualifiées ;
- la distinction entre un simple triangle local et une face ternaire
  réalisable lorsque `r ≥ 3`.

Si toutes les valeurs jusqu'à `|D|` sont qualifiées, la famille globale des
contextes est déterminée.

### 2.3 Ce qu'elle ne permet toujours pas

- décider les ensembles de taille supérieure à `r` sans loi de localité ;
- identifier si plusieurs hypercompatibilités partagent un même témoin ;
- déterminer les transitions entre réalisations ;
- prouver que la table est interne au système plutôt qu'au protocole ;
- conclure à l'irréalisabilité pour les entrées restées `inconnue`.

### 2.4 Réfutation possible

- un témoin global valide contredit une hypercompatibilité déclarée impossible ;
- une obstruction certifiée contredit une hypercompatibilité déclarée
  réalisable ;
- la fermeture descendante échoue alors que l'objet est annoncé simplicial ;
- deux représentations équivalentes attribuent des valeurs différentes au
  même ensemble ;
- une entrée annoncée exhaustive reste indécise ou omet une partie du domaine.

## 3. Ajout : témoins globaux

### 3.1 Information nouvelle

Ajouter un ensemble d'états ou certificats `Ω*` et leur incidence avec les
distinctions :

```text
I(ω,x) ⇔ le témoin ω réalise x.
```

Cette donnée conserve l'identité du témoin commun, information perdue lorsque
chaque paire est seulement marquée compatible.

### 3.2 Ce qu'elle permet de décider

- `J_S(A) = vrai` dès qu'un même `ω` réalise tous les éléments de `A` ;
- quelles compatibilités locales proviennent du même état ;
- tous les sous-contextes portés par chaque témoin ;
- les contextes positivement attestés ;
- la réalisabilité complète si, et seulement si, `Ω*` est certifié exhaustif.

### 3.3 Ce qu'elle ne permet toujours pas

- conclure qu'un ensemble sans témoin enregistré est impossible ;
- établir l'exhaustivité de `Ω*` par la seule collection de témoins ;
- décider si un témoin est accessible depuis une condition initiale donnée ;
- fournir une règle de composition entre témoins distincts ;
- déterminer la stabilité, le coût ou la durée d'une réalisation ;
- distinguer une possibilité rare d'une possibilité absente sans audit de
  détectabilité.

### 3.4 Réfutation possible

- un témoin annoncé commun ne satisfait pas simultanément tous les prédicats ;
- son état dépend d'un changement non déclaré d'environnement ou de régime ;
- deux encodages équivalents ne transportent pas la même incidence ;
- un ensemble de témoins annoncé exhaustif omet un état global valide ;
- une conclusion négative repose uniquement sur l'absence dans `Ω*` sans
  certificat d'exhaustivité.

## 4. Ajout : règle de composition

### 4.1 Information nouvelle

Ajouter une opération partielle ou totale sur les témoins locaux :

```text
ω_A ⊗ ω_B → ω_{A∪B},
```

avec :

- domaine de définition ;
- conditions de compatibilité ;
- loi de fermeture ;
- unité éventuelle ;
- associativité ou cohérences de parenthésage ;
- cas d'échec ;
- preuve que le résultat satisfait les prédicats réunis.

### 4.2 Ce qu'elle permet de décider

- si des témoins locaux identifiés peuvent être combinés selon la règle ;
- construire un témoin global lorsque la composition est définie, fermée et
  correcte ;
- comparer différents chemins de composition ;
- déterminer une réalisabilité globale pour les familles couvertes par un
  théorème de composition complète.

### 4.3 Ce qu'elle ne permet toujours pas

- assurer que la règle est unique ou interne au système ;
- décider des familles hors de son domaine ;
- conclure à l'impossibilité lorsque la composition échoue, sauf si l'échec est
  prouvé nécessaire ;
- garantir que tous les témoins globaux sont générables ;
- éliminer les obstructions supérieures non représentées ;
- décider l'accessibilité dynamique du témoin composé.

### 4.4 Réfutation possible

- la composition déclarée produit un état qui ne réalise pas l'union ;
- la fermeture échoue dans un cas du domaine annoncé ;
- deux parenthésages ou ordres supposés équivalents donnent des verdicts
  incompatibles ;
- un témoin global existe mais aucune composition annoncée complète ne peut le
  générer ;
- l'opération dépend d'une étiquette, d'un ordre de collecte ou d'un choix
  externe non contenu dans le système.

## 5. Ajout : recollement

### 5.1 Information nouvelle

Ajouter :

- une couverture du système par des parties locales ;
- des espaces de sections ou témoins locaux ;
- des applications de restriction sur les intersections ;
- une notion de cohérence des restrictions ;
- une obstruction au recollement ;
- un théorème reliant cette obstruction à l'existence, et éventuellement à
  l'unicité, d'une section globale.

Le recollement conserve non seulement quels supports sont compatibles, mais
comment leurs données locales s'accordent.

### 5.2 Ce qu'il permet de décider

- si une famille donnée de témoins locaux cohérents se prolonge globalement ;
- pourquoi des supports localement compatibles échouent à se réaliser
  ensemble ;
- l'existence ou l'unicité d'un témoin sous les hypothèses exactes du théorème ;
- la localisation d'une obstruction sur les recouvrements.

### 5.3 Ce qu'il ne permet toujours pas

- établir que la couverture choisie est interne au système ;
- décider des contextes non représentés par cette couverture ;
- garantir que tous les témoins locaux possibles ont été considérés ;
- exclure une contrainte globale absente des applications de restriction ;
- déduire une dynamique ou une accessibilité temporelle ;
- conclure lorsque l'obstruction n'est ni calculable ni détectable.

### 5.4 Réfutation possible

- cohérence locale et obstruction nulle sans témoin global ;
- témoin global valide malgré une obstruction annoncée nécessaire ;
- deux couvertures équivalentes donnent des conclusions incompatibles ;
- le verdict change sous une transformation de jauge ou de coordonnées neutre ;
- la solution globale est injectée dans les données locales, rendant le test
  circulaire.

## 6. Ajout : dynamique

### 6.1 Information nouvelle

Ajouter :

- des états et conditions initiales ;
- une relation ou loi de transition ;
- des actions et interventions autorisées ;
- les ressources, durées et perturbations pertinentes ;
- une notion de trajectoire ;
- des critères de simultanéité, stabilité et accessibilité.

La dynamique distingue une configuration statiquement admissible d'une
configuration effectivement atteignable dans un régime donné.

### 6.2 Ce qu'elle permet de décider

- si un contexte est atteignable depuis une condition initiale ;
- si des compatibilités seulement successives peuvent devenir simultanées ;
- quels contextes sont transitoires, stables ou récurrents ;
- si un témoin global peut être construit par une trajectoire autorisée ;
- comment une perturbation change l'ensemble des contextes accessibles.

### 6.3 Ce qu'elle ne permet toujours pas

- confondre inaccessibilité depuis une condition initiale avec impossibilité
  absolue ;
- établir l'exhaustivité des conditions initiales ou des interventions ;
- décider des états non atteints lorsque l'exploration des trajectoires n'est
  pas complète ;
- prouver que la loi de transition est interne plutôt qu'imposée ;
- reconstruire automatiquement les obstructions statiques non encodées ;
- conclure à l'absence d'un contexte sous détectabilité insuffisante.

### 6.4 Réfutation possible

- une trajectoire valide viole la loi de transition annoncée ;
- une configuration déclarée atteignable ne possède aucune trajectoire alors
  que l'espace de recherche est certifié complet ;
- une configuration déclarée inaccessible possède une trajectoire certifiée ;
- une reparamétrisation temporelle neutre change la seule décision
  d'atteignabilité ;
- deux états présentés comme identiques évoluent différemment à cause d'une
  variable omise.

## 7. Carte comparative

| Ajout | Unité d'information ajoutée | Décision nouvelle principale | Reste minimal |
|---|---|---|---|
| Ordres supérieurs | valeur de `J_S(A)` ou obstruction pour des hyperensembles | réalisabilité jusqu'à l'ordre renseigné | ordres supérieurs non renseignés |
| Témoins globaux | identité et incidence d'un état commun | preuve positive de coexistence | impossibilité et exhaustivité |
| Composition | opération entre témoins et lois de cohérence | constructibilité d'un témoin | complétude et nécessité de l'échec |
| Recollement | sections, restrictions et obstruction | extension de données locales compatibles | choix de couverture et contraintes hors couverture |
| Dynamique | transitions, trajectoires et initialisations | accessibilité et coexistence temporelle | possibilités statiques hors trajectoires couvertes |

## 8. Relations entre les ajouts

Ces ajouts ne forment pas une hiérarchie unique :

- des compatibilités d'ordre supérieur donnent des décisions sans expliquer
  comment les témoins se construisent ;
- des témoins donnent des preuves positives sans fournir les impossibilités ;
- une composition peut engendrer des témoins sans être exhaustive ;
- un recollement peut décider une couverture sans couvrir tous les contextes ;
- une dynamique peut décider l'accessibilité sans décider la possibilité
  statique absolue.

Ils sont donc partiellement complémentaires et partiellement redondants selon
le système. Leur équivalence éventuelle exigerait un théorème supplémentaire ;
elle ne doit pas être supposée.

## 9. Minimum informationnel borné

Le manque exact entre local et global peut être formulé ainsi :

```text
pour chaque A de taille ≥ 3,
un bit de réalisabilité qualifié,
ou une donnée équivalente permettant de le dériver sans perte.
```

Pour une réponse positive, un témoin commun est une donnée équivalente. Pour
une réponse négative, il faut une obstruction nécessaire ou un certificat
d'exhaustivité. Pour toute la famille des contextes, il faut la totalité de ces
décisions ou une loi prouvée complète qui les compresse.

La carte ne détermine pas quelle représentation est celle du système. Aucun
mécanisme n'est sélectionné et le statut scientifique reste `unknown`.
