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

## Provenance et statut de cette garde

La garde consolide des contraintes déjà portées par les audits d'effet de
méthode, de reste, de coût caché, de robustesse, de renversement et de validation
du changement. La frontière de neutralité, l'échelle de rôle des lois et la
comptabilité totale de compression sont une synthèse de gouvernance 11.x issue
des échecs et sous-déterminations documentés par le laboratoire. Elles ne sont
pas présentées comme des lois scientifiques ni comme des fragments 10.x.
