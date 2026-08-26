# Dérivation, autonomie et dépendances

## Relation à Corpus

Corpus Open Model est une **recherche dérivée** hébergée sous `research/`. Il
utilise les matériaux Corpus comme source versionnée et conserve leurs statuts.
Il n'est ni un composant du plugin, ni une nouvelle capability, ni une voie de
modification du produit. Toute primitive réutilisable devra suivre
`research → transfers → intégration → release → installation → réobservation`.

## Dépendances réellement observées

| Couche | Dépendance | État |
| --- | --- | --- |
| entraînement et évaluation v0 | Python 3 et bibliothèque standard | requise, locale |
| données | checkout Corpus observé | requise, versionnée par snapshot |
| exécution du modèle v0 | Codex, GPT, API externe, GPU | non requis |
| rédaction de cette recherche | Codex / modèle hôte | dépendance d'assistance à l'auteur, pas une dépendance de runtime ou des poids |
| futur adaptateur linguistique | modèle local open source **ou** API | non choisi ; doit être déclaré et évalué séparément |

Le fait que la recherche ait été amorcée avec Codex ne rend pas le modèle v0
dépendant de Codex. Inversement, l'absence de dépendance de runtime ne prouve
ni autonomie intellectuelle ni indépendance de maintenance.

## Politique de dépendance future

Un composant externe ne peut être ajouté que s'il fournit : version exacte,
licence, empreinte ou source, rôle, données qu'il reçoit, mode dégradé sans lui,
coût matériel, autorité de mise à jour et procédure de retrait. Une API ne doit
jamais être la seule porte d'accès aux connaissances Corpus.

## États de changement

Le réseau v0 est `written` et `tested_local`; il n'est pas autorisé, déployé,
publié ni réobservé sur une population indépendante. Ses artefacts produits
localement ne sont pas une release.
