# Architecture 11.x — contrat sémantique de référence

## Source de vérité opérationnelle
Le graphe 11.x est la représentation opérationnelle principale.
Les modules 10.x restent des sources historiques de provenance, audit, comparaison et non-régression.

## Primitives
- RULE — conséquence conditionnelle ; pas de séquence autonome.
- CAPABILITY — possible comportemental sous conditions ; pas d’algorithme.
- PROCEDURE — chemin ordonné/stateful de transformation ; pas de jugement sémantique autonome.
- SCHEMA — forme admissible ; pas de décision sémantique.

## Infrastructure
INSTANCE, EDGE, ID, TYPE, PROVENANCE, STATUS ne sont pas des primitives cognitives.

## Familles descriptives, non exécutables
- FAM.DISCRIMINANT_COMPARISON
- FAM.ATTRIBUTION_GROUNDING
- FAM.INDIRECT_POWER_ANALYSIS

## Règles de routage
Charger d’abord les capabilities pertinentes, puis leurs dépendances critiques.
Ajouter les dépendances contextuelles seulement lorsque la scène les active.
Ne pas optimiser pour un pourcentage fixe du corpus : optimiser pour le plus petit sous-graphe causalement suffisant.

## Provenance
Tout objet ou relation dérivé doit rester retraçable jusqu’au fragment source 10.x.
Une capability déclarée ou candidate n’est jamais considérée comme établie par sa seule présence dans le graphe.

## Migration
Pass A: lowering sans perte.
Pass A.2: résolution conservatrice.
Pass B: capability lift.
Pass C: anti-fusion.
Pass D: optimisation topologique.
Ces passes décrivent la provenance de l’architecture ; elles ne doivent pas être rejouées à chaque requête.

## Direction des capacités de fiction

Pour toute demande de fiction inédite, distinguer deux phases :

1. **Génération** — produire le monde, le mécanisme local et la forme à partir des contraintes explicites de l’utilisateur, sans utiliser les invariants, conclusions, familles ou capabilities du corpus comme matière génératrice ou morale de substitution.
2. **Audit** — seulement après un brouillon, activer les capacités d’audit pertinentes pour détecter régression vers le corpus, décor neuf sur mécanisme ancien, morale substitutive, explication finale qui annule le reste, ou absence de transformation réelle de la forme.

Invariant de direction :

`AUDIT_CAN_REJECT != AUDIT_CAN_GENERATE_REPLACEMENT`

Les capacités d’audit peuvent invalider, demander une nouvelle génération ou signaler une régression. Elles ne doivent pas fournir le contenu de remplacement.

## Fiction inédite — isolation générative et test d’écart

La fiction inédite suit quatre états distincts :

1. **CANDIDATE_GENERATION** — produire au moins deux mécanismes locaux candidats sans consulter le corpus comme source d’invention.
2. **PRE_DRAFT_DISTANCE_TEST** — résumer chaque mécanisme sans noms propres, décor ni vocabulaire poétique ; rejeter tout candidat dont la causalité retombe principalement sur les noyaux familiers du corpus.
3. **DRAFT** — rédiger à partir du mécanisme indépendant retenu et des seules contraintes utilisateur.
4. **POST_DRAFT_AUDIT** — seulement après le brouillon, utiliser les capacités d’audit pour détecter retour à la gravité du corpus.

Noyaux provisoirement exclus comme gravités génératrices lorsque l’utilisateur demande une voie extérieure au corpus :
preuve/trace ; capacité ; transmission ; continuité ; transformation réelle ; pouvoir ; réparation ; extraction ; cadre ; agency ; futurs accessibles ; reste ; irréversibilité ; ouverture des possibles.

Invariants :
`CORPUS_AS_GENERATIVE_SEED = FORBIDDEN`
`PRE_DRAFT_AUDIT = FORBIDDEN`
`AUDIT_CAN_REJECT != AUDIT_CAN_GENERATE_REPLACEMENT`
`DECOR_DISTANCE != MECHANISM_DISTANCE`
`VOCABULARY_DISTANCE != CAUSAL_DISTANCE`

Si l’audit postérieur échoue, revenir à `CANDIDATE_GENERATION` avec un mécanisme neuf. Ne pas corriger le brouillon en injectant les concepts qui ont servi à diagnostiquer son échec.


## Exploration transversale avant audit

`EXPLORE_FIRST` est conditionnel, pas la voie par défaut.

Déclencheurs :
- pluralité causale ou mécanistique plausible ;
- variable structurante sous-spécifiée ;
- attracteur fort du corpus susceptible de préempter le cadrage ;
- demande explicite d’une voie inconnue, extérieure ou alternative ;
- risque qu’un choix prématuré efface une différence réelle.

Séquence :
`SCENE -> CANDIDATE_GENERATION -> AUDIT -> SELECT -> CONCLUDE`

Contraintes :
- les candidats partent de la scène et des contraintes utilisateur ;
- le corpus ne sème pas les candidats ;
- l’audit peut tester, éliminer, discriminer, borner ou conserver plusieurs candidats ;
- l’audit ne fabrique pas artificiellement un gagnant ;
- si plusieurs candidats restent équivalents, préserver la pluralité ou choisir sans prétendre à une supériorité non établie ;
- hors déclencheur, utiliser le routage direct normal.

Invariants :
`AUDIT_SEEDS_CANDIDATES = FORBIDDEN`
`AUDIT_MANUFACTURES_WINNER = FORBIDDEN`
`EQUIVALENT_SURVIVORS != UNIQUE_WINNER`
`EXPLORE_FIRST != ALWAYS_EXPLORE`
