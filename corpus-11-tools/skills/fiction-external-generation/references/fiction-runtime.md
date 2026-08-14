

Pour une requête de fiction explicitement inédite :

- phase GENERATE : ne pas activer les capabilities d’audit du corpus comme sources de contenu ;
- produire un premier monde depuis les contraintes utilisateur + mécanisme local indépendant ;
- phase AUDIT : activer ensuite `CAP.FICTION_MECHANISM_TRANSFORMATION`, `CAP.DIFFERENCE_REMAINDER_ASSESSMENT`, `CAP.METHOD_EFFECT_AUDIT` et autres dépendances seulement pour tester le brouillon ;
- si l’audit échoue, régénérer sans réutiliser les concepts de l’audit comme thème, métaphore ou morale de substitution.

Invariant : `audit -> reject/regenerate`, jamais `audit -> invent replacement`.

## Runtime gate — fiction inédite extérieure au corpus

Ordre obligatoire :

`CANDIDATE_GENERATION -> PRE_DRAFT_DISTANCE_TEST -> DRAFT -> POST_DRAFT_AUDIT`

### CANDIDATE_GENERATION
- produire silencieusement >=2 mécanismes fictionnels ;
- ne charger aucune capability du corpus comme source de thème, morale, métaphore ou mécanisme ;
- conserver seulement contraintes utilisateur + exigences générales de sécurité/forme.

### PRE_DRAFT_DISTANCE_TEST
- résumer chaque candidat sans noms propres ni décor ;
- rejeter si la causalité centrale retombe principalement sur : preuve/trace, capacité, transmission, continuité, transformation réelle, pouvoir, réparation, extraction, cadre, agency, futurs accessibles, reste, irréversibilité, ouverture des possibles ;
- sélectionner un mécanisme dont le résumé demeure causalement distinct.

### DRAFT
- écrire depuis le mécanisme retenu ;
- ne pas corriger en temps réel avec les capacités d’audit.

### POST_DRAFT_AUDIT
- activer `CAP.FICTION_MECHANISM_TRANSFORMATION`, `CAP.DIFFERENCE_REMAINDER_ASSESSMENT`, `CAP.METHOD_EFFECT_AUDIT` et dépendances nécessaires ;
- verdict possible : PASS ou REGENERATE ;
- en cas de REGENERATE, retour à CANDIDATE_GENERATION ;
- l’audit ne fournit jamais le mécanisme de remplacement.

Règle de sens : `audit -> verdict`, jamais `audit -> content`.


