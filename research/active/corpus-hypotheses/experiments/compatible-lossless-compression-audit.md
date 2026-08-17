# Audit des représentations compressées sans perte

## Statut et périmètre

Audit théorique sans expérience, sans nouveau mécanisme et sans interprétation
physique.

Les candidats audités sont uniquement ceux déjà formalisés :

- table explicite d'ordre supérieur ;
- facettes ;
- non-faces minimales ;
- témoins globaux exhaustifs ;
- graphe muni d'un théorème flag ;
- `k`-squelette muni d'un théorème de `k`-détermination ;
- mécanisme générique complet — contraintes, composition ou recollement —
  traité comme encodeur/décodeur, sans en choisir un.

Le statut scientifique reste `unknown`.

## 1. Critère d'une vraie compression structurelle

Soit `T(K)` la représentation explicite de référence d'un complexe `K`, et
soit une représentation candidate :

```text
Code(K) = (R, θ, X, C)
```

où :

- `R` est le décodeur ou la règle ;
- `θ` contient les paramètres propres à l'instance ;
- `X` contient les exceptions ;
- `C` décrit la classe et la frontière de validité.

Une compression est structurelle et sans perte seulement si :

1. `Decode(Code(K)) = K` exactement ;
2. le même `R` traite une classe non triviale fixée avant l'instance ;
3. `R`, `θ`, `X`, `C` et toute donnée auxiliaire sont comptés ;
4. le décodeur n'interroge aucun oracle contenant implicitement `K` ;
5. l'appartenance à la classe est décidée indépendamment de la réussite du
   décodage ;
6. les exceptions ne réencodent pas la table explicite ;
7. la longueur totale est inférieure à celle de la référence sous une
   convention de codage gelée ;
8. la preuve de reconstruction vaut pour toute la classe annoncée.

Une sortie courte n'est pas une compression si son décodeur ou ses paramètres
contiennent l'information retirée de la sortie.

## 2. Référence : table explicite d'ordre supérieur

### Information conservée

La valeur qualifiée de `J(A)` pour chaque ensemble pertinent de taille au moins
trois, avec la frontière `D` et les données locales `L_2`.

### Décodeur nécessaire

Un décodeur fixe minimal : indexer les sous-ensembles et lire leur valeur. La
fermeture descendante peut être vérifiée séparément.

### Paramètres cachés

- ordre canonique des distinctions ;
- convention d'indexation des sous-ensembles ;
- encodage des états `vrai`, `faux certifié`, `inconnu` ;
- domaine exact couvert par la table.

### Exceptions

Aucune n'est nécessaire si la table est totale. Les entrées absentes doivent
rester `inconnu`, et non être interprétées comme fausses.

### Preuve de complétude

Vérifier que chaque sous-ensemble du domaine reçoit exactement une valeur et
que les valeurs respectent la fermeture descendante annoncée.

### Réfutation

- entrée manquante malgré une prétention de totalité ;
- deux valeurs pour le même ensemble ;
- incohérence descendante ;
- valeur contredite par un certificat valide.

### Qualification

Représentation complète de référence, mais pas compression structurelle.

## 3. Antichaîne des facettes

### Information conservée

Les ensembles réalisables maximaux. Toutes les faces sont implicitement leurs
sous-ensembles.

### Décodeur nécessaire

```text
J(A) = vrai ⇔ il existe une facette F telle que A ⊆ F.
```

Le décodeur est fixe et indépendant de l'instance.

### Paramètres cachés

- domaine `D` ;
- ordre canonique des sommets ;
- convention de suppression des facettes dupliquées ou incluses dans une
  autre.

### Exceptions

Aucune dans la classe des complexes descendants finis. Une exception indiquant
une face non contenue dans une facette signalerait que l'objet n'appartient pas
à la classe annoncée.

### Preuve de complétude

Dans tout complexe fini, chaque face est contenue dans une face maximale. Donc :

```text
K = union_{F ∈ Fac(K)} P(F).
```

La preuve est uniforme et ne dépend pas des résultats de l'instance.

### Réfutation

- une face de `K` n'est contenue dans aucune facette encodée ;
- une facette encodée contient une non-face ;
- deux complexes distincts décodent depuis la même antichaîne ;
- une facette maximale manque.

### Qualification

Représentation équivalente complète. Elle constitue une vraie compression sur
les instances ayant peu de facettes, mais aucune réduction uniforme de taille
n'est garantie.

## 4. Antichaîne des non-faces minimales

### Information conservée

Les obstructions minimales `B` telles que `J(B) = faux` mais `J(B') = vrai`
pour toute partie propre `B'`.

### Décodeur nécessaire

```text
J(A) = vrai ⇔ aucune non-face minimale B n'est incluse dans A.
```

### Paramètres cachés

- domaine `D` ;
- ordre canonique ;
- convention de minimalité ;
- traitement explicite d'une éventuelle obstruction vide.

### Exceptions

Aucune pour un complexe descendant fini. Une liste d'obstructions non
minimales reste décodable mais n'est plus la représentation canonique annoncée.

### Preuve de complétude

Toute non-face d'un domaine fini contient une non-face minimale. La liste
complète des minimales décide donc chaque ensemble.

### Réfutation

- une non-face ne contient aucune obstruction encodée ;
- une obstruction encodée est réalisable ;
- une obstruction annoncée minimale contient une sous-obstruction ;
- deux complexes distincts partagent le même code.

### Qualification

Représentation équivalente complète. Elle compresse réellement les instances
ayant peu d'obstructions minimales, sans garantie de gain dans le pire cas.

## 5. Témoins globaux exhaustifs

### Information conservée

Pour chaque témoin `ω`, son support :

```text
Supp(ω) = {x ∈ D | ω réalise x}.
```

Cette représentation peut conserver plus que le complexe si elle maintient
l'identité ou la multiplicité de témoins ayant le même support.

### Décodeur nécessaire

```text
J(A) = vrai ⇔ il existe ω tel que A ⊆ Supp(ω).
```

Après quotient des supports dupliqués et suppression des supports inclus dans
d'autres, le décodeur se réduit à celui des facettes.

### Paramètres cachés

- définition d'un témoin valide ;
- environnement et régime ;
- règle d'équivalence entre témoins ;
- certificat d'exhaustivité ;
- traitement des multiplicités et états inaccessibles.

### Exceptions

- témoins possibles mais non recensés ;
- témoins partiels ;
- changements de régime ;
- supports supposés impossibles sans certificat.

Chaque exception positive omise peut changer le complexe global.

### Preuve de complétude

Il faut prouver que tout état global admissible est représenté ou que chaque
support réalisable est inclus dans un support recensé. Une simple collecte de
témoins positifs ne fournit pas cette preuve.

### Réfutation

- découverte d'un support réalisable non couvert ;
- témoin encodé ne réalisant pas son support ;
- deux régimes incompatibles fusionnés ;
- décision négative fondée sur une liste non exhaustive.

### Qualification

Représentation équivalente seulement avec exhaustivité. Elle peut être plus
grande que la liste des facettes ; sans preuve d'exhaustivité, elle est
partielle et non sans perte.

## 6. Graphe avec décodeur flag

### Information conservée

Le `1`-squelette : singletons et compatibilités par paires.

### Décodeur nécessaire

```text
J(A) = vrai ⇔ toutes les paires de A sont des arêtes.
```

Le décodeur est court, mais il n'est exact que sur la classe des complexes
flag.

### Paramètres cachés

- assertion d'appartenance à la classe flag ;
- frontière `D` ;
- complétude du graphe ;
- sens uniforme de la compatibilité ;
- preuve que les obstructions minimales ont toutes taille deux.

### Exceptions

Chaque clique non réalisable est une exception d'ordre supérieur. Une liste
d'exceptions peut restaurer l'exactitude, mais elle doit être comptée. Si elle
devient la liste des non-faces minimales supérieures, l'information n'a pas
disparu.

### Preuve de complétude

Un théorème indépendant doit établir que le complexe est exactement le
complexe de cliques de son graphe. Vérifier seulement que les contextes connus
sont des cliques ne suffit pas.

### Réfutation

- une clique du graphe n'est pas réalisable ;
- une face réalisable contient une paire absente ;
- deux complexes ayant le même graphe sont admis par la classe ;
- la liste d'exceptions réencode les faces supérieures.

### Qualification

Candidat de vraie compression structurelle sur une classe flag établie. Sans
preuve de classe, il s'agit d'un déplacement de l'information vers l'axiome
flag. Statut d'application : `unknown`.

## 7. `k`-squelette avec décodeur `k`-déterminé

### Information conservée

Toutes les valeurs de réalisabilité jusqu'à l'ordre `k`.

### Décodeur nécessaire

```text
J(A) = vrai ⇔ J(B) = vrai pour tout B ⊆ A avec |B| ≤ k.
```

### Paramètres cachés

- valeur de `k` ;
- provenance interne de `k` ;
- classe de systèmes ;
- preuve qu'aucune obstruction minimale n'a taille supérieure à `k` ;
- frontière et granularité.

### Exceptions

Toute obstruction minimale d'ordre supérieur à `k`. Les stocker séparément
peut restaurer le décodage, mais leur coût doit être ajouté au squelette.

### Preuve de complétude

Un théorème uniforme doit établir la `k`-détermination pour toute la classe.
Choisir `k` après inspection du plus grand contre-exemple est circulaire.

### Réfutation

- toutes les parties d'ordre au plus `k` sont réalisables mais l'ensemble ne
  l'est pas ;
- deux complexes de la classe annoncée partagent leur `k`-squelette mais
  diffèrent globalement ;
- `k` ou la classe change après échec ;
- les exceptions croissent jusqu'à reproduire la table supérieure.

### Qualification

Candidat de vraie compression structurelle sur une classe prouvée
`k`-déterminée. Sinon l'information est déplacée vers `k`, la preuve de classe
ou les exceptions. Statut d'application : `unknown`.

## 8. Mécanisme générique complet

### Information conservée

Une règle `R` — système de contraintes, composition ou recollement —, ses
paramètres `θ`, son domaine et les données locales nécessaires.

### Décodeur nécessaire

Un procédé total qui décide `J(A)` pour tout `A` du domaine et reconstruit les
facettes ou non-faces minimales sans consulter la sortie attendue.

### Paramètres cachés

- opérations et constantes ;
- ordre de composition ou couverture ;
- conditions de frontière et ressources ;
- données de cohérence ou d'obstruction ;
- règle d'arrêt ;
- version du mécanisme ;
- preuve d'appartenance de l'instance au domaine.

### Exceptions

- cas non couverts ;
- corrections ponctuelles ;
- tables de correspondance ;
- branches spéciales ;
- oracles externes ;
- échecs de convergence interprétés comme impossibilités.

Toutes doivent être comptées comme information d'instance ou restriction de
classe.

### Preuve de complétude

Il faut établir simultanément :

- correction : chaque `vrai` décodé possède un témoin valide ;
- complétude : chaque témoin valide est accepté ;
- terminaison sur tout le domaine ;
- unicité de la décision ;
- invariance sous les représentations équivalentes ;
- absence d'accès au résultat à reconstruire.

### Réfutation

- faux positif ou faux négatif certifié ;
- non-termination sur une entrée du domaine ;
- deux encodages équivalents donnent des complexes différents ;
- collision entre deux complexes ;
- paramètre ou exception contient une table non comptée ;
- la classe est redéfinie après observation d'un échec.

### Qualification

`unknown` tant que coût total et théorème de reconstruction ne sont pas
établis. Une sortie courte seule ne distingue pas compression et déplacement.

## 9. Test de déplacement de l'information

L'information est seulement déplacée si au moins un des faits suivants est
nécessaire :

- le décodeur contient des données propres à l'instance ;
- les paramètres ou exceptions croissent comme la table supprimée ;
- l'appartenance à la classe est décidée en comparant au résultat ;
- une table externe, un oracle ou un historique est requis ;
- le mécanisme ne décide que les cas déjà fournis ;
- une erreur de décodage est reclassée comme exception sans borne ;
- le coût du théorème, de la frontière ou des conditions initiales est omis.

Le test décisif reste le même : si deux complexes distincts possèdent le même
code complet, la représentation est avec perte.

## 10. Tableau de synthèse

| Candidat | Sans perte sous condition | Compression structurelle possible | Risque principal |
|---|---|---|---|
| Table supérieure | totalité explicite | non, référence | taille combinatoire |
| Facettes | complexe fini descendant | oui, selon l'instance | nombreuses facettes |
| Non-faces minimales | complexe fini descendant | oui, selon l'instance | nombreuses obstructions |
| Témoins exhaustifs | exhaustivité certifiée | parfois | exhaustivité cachée |
| Graphe flag | classe flag prouvée | oui | axiome flag portant l'information |
| `k`-squelette | classe `k`-déterminée prouvée | oui | `k` et exceptions ajustés |
| Mécanisme complet | décodeur exact et total | possible | table déplacée dans règle ou paramètres |

## Verdict

Les facettes et non-faces minimales sont des représentations équivalentes sans
perte par un théorème uniforme, mais leur gain de taille dépend de l'instance.
Le graphe flag et le `k`-squelette peuvent être de vraies compressions
structurelles seulement si l'appartenance à leur classe est établie
indépendamment. Les témoins et mécanismes génériques restent incomplets tant
que leur exhaustivité et leur coût total ne sont pas démontrés.

Aucun candidat n'est sélectionné. L'application à un système demeure
`unknown`.
