# Garde de gouvernance épistémique

## Portée

Cette garde s'applique lorsqu'une analyse compare ou attribue des modèles, lois,
représentations, compressions, invariances, portées, prédictions ou robustesses.
Elle ne crée aucune nouvelle capability, famille scientifique ou loi candidate.
Elle contraint le passage entre description, sélection et attribution.

Objectif : distinguer les contraintes générées par le système des contraintes
introduites par la description, la méthode ou l'espace de modèles.

## Trois axes à ne pas fusionner

### Statut scientifique d'une proposition

`unknown | candidate | active | weakened | rejected | suspended`

Cet axe décrit l'état d'une hypothèse ou d'une conclusion scientifique.

### Rôle épistémique d'une loi

1. `descriptive_convention` — choix réversible de notation ou de représentant,
   sans réduction des complétions ni différence observable.
2. `model_rule` — règle ajoutée pour rendre le modèle opératoire ; son
   appartenance au système n'est pas établie.
3. `declared_model_primitive` — règle irréductible déclarée et comptée comme
   information du modèle, sans dérivation inférieure revendiquée.
4. `system_internal_candidate` — primitive ou règle produisant des conséquences
   indépendantes, invariantes et réfutables susceptibles d'être attribuées au
   système.
5. `observed_system_constraint` — contrainte discriminante réobservée par un
   accès indépendant dans le domaine annoncé.

Ces rôles ne forment pas une promotion automatique. Un bon ajustement, une
preuve dans le modèle ou une implémentation robuste ne suffit pas pour changer
de rôle.

### Cycle de vie d'un changement

`declared | written | tested | authorized | deployed | reobserved`

Cet axe décrit le changement du cortex ou du laboratoire. Il ne mesure ni le
statut scientifique ni l'internalité d'une loi.

## Frontière de neutralité

Un choix est conservateur seulement si les quatre conditions sont satisfaites :

1. il est réversible ou traduisible sans perte ;
2. il conserve l'espace des complétions à équivalence près ;
3. il ne crée aucune différence observable admissible ;
4. il ne sélectionne pas une structure parmi plusieurs structures auparavant
   possibles.

Test de retrait : retirer le choix en conservant les mêmes primitives.

- conclusion inchangée après traduction : convention descriptive ;
- calcul moins commode mais sortie équivalente : choix méthodologique ;
- conclusion perdue ou espace des systèmes élargi : hypothèse ou information
  ajoutée au modèle.

Le choix du groupe d'équivalences doit lui-même être déclaré. Une invariance de
renommage peut être conservatrice ; une invariance attribuée à une
transformation du système est une hypothèse structurelle.

## Critère de sélection n'est pas propriété du système

Simplicité, compression et portée sont par défaut des préférences de modèle.
Prédictivité et robustesse deviennent informatives seulement par confrontation
indépendante. L'invariance est conservatrice sous changement de représentation et
structurelle lorsqu'elle affirme une symétrie du système.

Pour toute sélection, déclarer :

- le langage et les primitives gratuites ;
- le domaine commun ;
- les transformations admises ;
- la métrique et les seuils ;
- les paramètres et exceptions ;
- les conditions d'échec symétriques ;
- ce que le retrait du critère réintroduit.

Un critère qui élimine des complétions ajoute une hypothèse, même s'il est
présenté comme méthodologique.

## Compression : comptabilité totale

Une sortie courte n'établit pas une compression structurelle. Compter :

`code + decoder + parameters + exceptions + validity_domain + shared_information + completeness_certificate`

La compression est structurelle seulement si la reconstruction est exacte sur
le domaine déclaré et si l'information manquante n'est pas déplacée dans l'une
de ces composantes. Une réduction dépendante d'un langage ou d'un amortissement
reste relative à ce référentiel.

## Fondation et sous-détermination

Lorsque les primitives admettent plusieurs complétions non équivalentes, aucune
loi de complétion unique n'en est une conséquence logique. Une loi supplémentaire
doit alors être :

- déclarée comme information ajoutée ;
- fixée avant les résultats ;
- uniforme et invariante ;
- dépourvue d'accès à la cible ;
- réfutable sur un domaine fixé indépendamment ;
- comptée avec ses paramètres, exceptions et domaine.

La déclarer primitive arrête une régression dans le modèle ; cela ne démontre
pas son internalité au système.

## Familles concurrentes et auto-immunisation

Une comparaison par paire établit seulement une préférence relative. Pour une
sélection scientifique, l'espace concurrent doit être borné avant résultat.

Garde minimale :

- au moins deux classes extensionnelles réellement divergentes ;
- une condition de perte pour chaque membre ;
- un résultat admissible capable de faire perdre la famille versionnée ;
- des règles d'admission indépendantes des résultats ;
- toute réparation après échec devient une nouvelle version ;
- les formulations extensionnellement équivalentes sont quotientées.

Si la famille contient une loi pour toute table de résultats possible, elle est
universellement absorbante et non discriminante. Si toutes les lois admissibles
restent équivalentes sous toutes les observations accessibles, préserver la
pluralité ou classer la différence comme conventionnelle ; ne pas fabriquer un
vainqueur.

## Gouvernance des trajectoires de représentation

Une conclusion n'est pas seulement auditée à l'état final. Lorsque l'analyse
change de représentation, de primitive, d'échelle, de partition ou de niveau
d'agrégation, conserver la trajectoire de ce changement.

Principe directeur : une prise locale sur un phénomène ne doit pas devenir
silencieusement une totalisation. Le contrechamp n'est pas un vote symétrique :
il sert à exposer la déformation possible de la prise initiale et doit lui-même
pouvoir perdre sous un discriminant indépendant.

Pour chaque transformation matérielle, déclarer lorsque pertinent :

- `operation` — compression, fusion, quotient, invention de primitive,
  reclassification, changement d'échelle, oubli, etc. ;
- `representation` — cadre dans lequel le gain est obtenu ;
- `gain` — prédiction, intervention, compression ou discrimination acquise ;
- `losses` — informations, distinctions, cas limites ou voies causales masqués,
  identifiés ou détruits par l'opération ;
- `counterchecks` — tentatives de dissolution et alternatives concurrentes ;
- `independent_discriminant` — observation qui ne réutilise pas le critère de
  sélection comme preuve de la propriété attribuée ;
- `reversal_condition` — résultat qui force la révision ;
- `reopen_condition` — pour une fusion provisoire, condition qui restaure la
  distinction ;
- `recovery_path` — pour une perte volontaire, voie permettant de reconstruire
  ce qui importe.

### Opérations destructives

Compression, fusion, quotient, coarsening et oubli exigent un registre des
pertes. Un résidu n'est pas traité comme naturellement secondaire : il est
relatif au modèle qui l'a produit.

Une fusion empirique établit au plus `A ~_E B` dans l'espace expérimental `E` ;
elle n'établit pas `A = B`. Maintenir une condition de réouverture lorsqu'un
futur test pourrait les séparer.

Un oubli n'est justifié comme `earned_forgetting` que si ce qui importe reste
reconstructible par une voie indépendante ou adressable. Si la perte est
irréversible, la déclarer comme telle avec son coût ; ne pas la rebaptiser
compression neutre.

### Primitives inventées

Avant de réifier une variable ou primitive latente :

1. tenter de la dissoudre dans des invariants ou variables déjà déclarés ;
2. construire au moins une explication où elle est un artefact de mesure,
   représentation ou sélection ;
3. chercher un discriminant indépendant ou un transport hors du dispositif qui
   l'a générée ;
4. conserver son rôle comme `candidate` tant que ces alternatives survivent.

### Ouverture et fermeture

Réduire l'incertitude n'est pas toujours un progrès : une observation correcte
peut ouvrir des possibilités auparavant exclues par une fausse certitude.
L'ouverture gagnée doit toutefois rester discriminable ; elle ne justifie pas
une prolifération sans condition d'arrêt.

Inversement, fermer une famille d'hypothèses est justifié seulement lorsque la
fermeture survit aux contrôles déclarés. Une falsification ne doit pas devenir
une recherche adaptative illimitée d'un protocole favorable.

### Audit de la méthode elle-même

Les mêmes gardes s'appliquent aux méthodes de recherche : une méthode peut
induire ses propres objets naturels, erreurs préférées, angles morts et
attracteurs. Lorsque plusieurs procédures sont comparées, mesurer si leurs
conclusions changent avec l'ordre d'observation, le langage, l'échelle, la
métrique ou l'espace de modèles.

Le but n'est pas de construire une méthode extérieure à tout point de vue, mais
de conserver une carte explicite des dépendances du résultat au point de vue et
de tester lesquelles transportent.

La récursion s'arrête lorsqu'un audit supplémentaire ne peut plus changer une
conclusion, une attribution, une condition de renversement, un test futur ou la
trajectoire retenue.

## Sortie minimale d'un audit de loi

Lorsque ces distinctions peuvent changer la conclusion, rendre explicitement :

- `scientific_status` ;
- `law_role` ;
- `selection_basis` ;
- `neutrality` ;
- `information_added` ;
- `independent_discriminant` ;
- `reversal_condition` ;
- `remaining_ambiguity`.

Pour une transformation matérielle de représentation, ajouter si nécessaire :

- `representation` ;
- `operation` ;
- `gain` ;
- `loss_ledger` ;
- `counterchecks` ;
- `reopen_condition` ;
- `recovery_path`.

Un champ inconnu reste `unknown` ; il n'est pas complété par préférence.

## Invariants de routage

`SELECTION_CRITERION != SYSTEM_PROPERTY`

`MODEL_PRIMITIVE != SYSTEM_INTERNAL`

`SHORT_CODE != STRUCTURAL_COMPRESSION`

`REVERSIBLE_CHOICE != STRUCTURAL_EVIDENCE`

`OBSERVED_FIT != INTERNALITY`

`PAIRWISE_WIN != UNIQUE_SELECTION`

`EQUIVALENT_SURVIVORS != UNIQUE_WINNER`

`AUDIT_CAN_REJECT != AUDIT_CAN_SEED_LAW`

`LOCAL_REPRESENTATION != SYSTEM_TOTALITY`

`RESIDUAL != NATURALLY_SECONDARY`

`MERGED_UNDER_EVIDENCE != IDENTICAL`

`FRUITFUL_ERROR != TRUE_THEORY`

`FAILED_THEORY != USELESS_TRANSFORMATION`

`MORE_CERTAINTY != MORE_KNOWLEDGE`

`COUNTERFIELD != AUTOMATIC_BALANCE`

`SELF_AUDIT != INFINITE_RECURSION`

## Provenance et statut de cette garde

La garde consolide des contraintes déjà portées par les audits d'effet de
méthode, de reste, de coût caché, de robustesse, de renversement et de validation
du changement. La frontière de neutralité, l'échelle de rôle des lois et la
comptabilité totale de compression sont une synthèse de gouvernance 11.x issue
des échecs et sous-déterminations documentés par le laboratoire. La gouvernance
de trajectoire généralise des patterns réobservés dans plusieurs expériences
(préenregistrement, absorption standard, transport, requalification et arrêt)
sans importer leurs objets ou résultats. Ces règles ne sont pas présentées comme
des lois scientifiques ni comme des fragments 10.x.
