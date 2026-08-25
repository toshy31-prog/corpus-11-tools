# Epistemic Trajectory Lab

Ce laboratoire gouverne les **changements de représentation** eux-mêmes : compresser, fusionner, quotienter, inventer une primitive, oublier, reframer ou attribuer une propriété au système.

Il ne décide pas ce qui est vrai et ne cherche pas un compromis entre deux positions. Son rôle est plus étroit : empêcher qu'une prise locale sur un phénomène devienne silencieusement une totalisation, tout en empêchant le scepticisme infini d'interdire toute accumulation.

## Principe

Une opération épistémique est évaluée avec son champ **et** avec les déformations qu'elle introduit. L'objectif n'est pas l'équilibre 50/50, mais la correction mutuelle par des discriminants indépendants.

Un mouvement suffisamment riche déclare au minimum :

- `operation` : transformation effectuée ;
- `claim` : statut revendiqué (`candidate`, `system_property`, `descriptive_convention`, etc.) ;
- `representation` : représentation dans laquelle la revendication est formulée ;
- `gain` : ce que l'opération rend possible ;
- `losses` : registre explicite de ce qu'elle masque, identifie ou détruit ;
- `counterchecks` : tentatives de dissolution ou alternatives réellement concurrentes.

Selon l'opération, le contrat peut aussi exiger : `independentDiscriminant`, `reversalCondition`, `reopenCondition`, `reconstructible`, `recoveryPath`, `alternativeRepresentation` ou une justification d'irréversibilité.

## Invariants

- Une compression, fusion, quotient ou oubli sans registre des pertes est suspendu.
- Une primitive inventée doit subir au moins une tentative de dissolution et une alternative d'artefact.
- Une fusion reste provisoire tant qu'une condition de réouverture n'est pas définie.
- Un oubli n'est « gagné » que si le contenu pertinent reste reconstructible par une voie déclarée.
- Une propriété attribuée au système exige un discriminant indépendant de la représentation ou du critère qui l'a sélectionnée.
- Une méthode n'est pas rendue correcte par symétrie avec son contrechamp : les deux peuvent perdre.
- L'absence de condition de renversement ou de représentation alternative produit un avertissement, pas automatiquement une réfutation.

## Pourquoi un laboratoire séparé

`experiment-lab/` gèle et exécute des expériences. `epistemic-trajectory/` audite la **forme du déplacement conceptuel** entre états de connaissance. Il peut donc être utilisé après une expérience, lors d'une requalification, ou pour auditer une méthode de recherche elle-même.

Cette abstraction vient de patterns réobservés dans plusieurs expériences Corpus (préenregistrement, absorption standard, transport, arrêt après falsification), puis a été décontextualisée. Aucun résultat particulier de `research/` n'est importé ici.

## Vérification

```bash
node --test corpus-11-tools/labs/epistemic-trajectory/tests/*.test.mjs
```

Le passage des tests établit seulement la cohérence locale du contrat. Il n'établit pas que ces gardes sont universellement suffisantes pour toute science ou tout domaine.
