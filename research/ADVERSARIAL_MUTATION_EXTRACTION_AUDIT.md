# Audit après chantier 1 — mutations adversariales répétées

Date : 2026-09-05

## Question

Le harnais de réplication locale justifie-t-il d’extraire maintenant un moteur
commun de mutations adversariales ?

## Observé

Deux familles ont été vérifiées :

| Famille | Mutation | Oracle et arrêt propres |
| --- | --- | --- |
| `adversarial-agent-boundaries` | alias, `kind`, nesting, fragments, portée et type de confiance | contrat de cible/source/action/portée et rejet fermé de onze objets structurés |
| `provenance-interoperability-lab` | chacun des quinze scalaires d’un noyau de provenance | aller-retour dans deux profils, noyau exact et registre de perte |

Elles répètent seulement une forme mécanique très faible : transformer une
fixture et comparer une observation à une attente. Elles ne partagent ni
espace d’objets, ni notion de mutation, ni oracle, ni condition de retrait. Le
premier traverserait des arbres d’instructions et des autorisations ; le second
mute un reçu sérialisé et contrôle sa conservation. Les deux générateurs et
leurs évaluateurs sont co-conçus dans leurs recherches respectives.

## Décision

Aucune extraction n’est justifiée. Le harnais nouvellement écrit apporte la
réplication d’une exécution séparée, pas un invariant démontré pour composer
des mutations de domaines différents. Un moteur commun aujourd’hui imposerait
soit des représentations artificielles, soit un oracle central : dans les deux
cas, il effacerait précisément les spécificités que les contrôles cherchent à
exercer.

## Seuil de réouverture

Proposer un moteur seulement si au moins deux recherches supplémentaires
apportent, sans branche de domaine : (1) une description déclarative de la
mutation, (2) un mécanisme de génération réutilisable, (3) un oracle de
différence séparé et (4) des contrôles négatifs où le moteur laisse visible une
divergence. Il faudra alors le soumettre au harnais de réplication séparée.

## Statut

- **Proposé** : aucun moteur de mutations.
- **Écrit** : cet audit, sans code de mutation ajouté.
- **Testé** : les deux suites de mutation existantes sont rejouées.
- **Intégré** : non applicable.
- **Réobservé** : requis au seuil de réouverture ; l’absence d’extraction est
  la décision actuelle, pas une preuve que le besoin n’existera jamais.
