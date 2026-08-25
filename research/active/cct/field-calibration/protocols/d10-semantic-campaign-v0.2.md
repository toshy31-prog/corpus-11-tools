# CCT-SC-D10-002 — protocole sémantique fictif O1–O4

Statut auto-déclaré dans la configuration : **protocole fixé avant exécution**,
sans verrou temporel indépendant. Portée : `model_internal`, avec reconstruction
`pipeline_verified`. L'artefact est retiré et remplacé par la v0.3 pour les
défauts O3, O4 et budget détaillés dans son rapport.

## Question

Dans les mêmes mondes fictifs et avec le même budget d’action, D10 et un rival
crédible à journal append-only et recours indépendant produisent-ils des
différences sur les capacités réellement utilisables, la charge complète, la
contestation d’une décision et la restitution ?

## Générateur

Les 32 mondes sont le produit exhaustif de cinq axes binaires : charge, canal,
inscription de la décision, exactitude de la porte protégée et redondance de
l’environnement. Chaque axe doit modifier au moins une sortie primaire ; le
pipeline invalide le protocole sinon. Trois variations exercent le coût de
l’observation et l’horizon de restitution.

Le monde contient un état vrai explicite : décision attendue, auteur,
ressource saturée, porte requise, inscription ou non au registre, file,
charge par rôle et correction attendue. Les deux mécanismes reçoivent cet état
et huit actions au maximum.

## Observations

- O1 : tentative d’usage séparée des cinq portes, plus récit dérivé de l’état
  de capacité ; aucune moyenne.
- O2 : heures par rôle, délai, abandons et journaux visible, caché et perdu.
- O3 : trace comparée à l’état vrai, puis défi standard traité par un rôle
  distinct de l’auteur. Une contestation ne réussit que si elle atteint ce
  rôle, produit la bonne décision et modifie réellement l’état.
- O4 : journal de reprise, file, réactivation et tentative d’usage après la
  reprise.

L’oracle de transition ne reçoit ni l’étiquette du mécanisme, ni ses
paramètres, ni un score. Il vérifie la vérité de la trace et les transitions
effectives. Une chaîne complète mais fausse échoue.

## Modèles rivaux et verdicts

Le rival n’est pas un témoin vide : il possède un journal append-only, un
examinateur distinct et une voie de recours, avec le même budget d’action.
Chaque paire est comparée par dominance de Pareto sur les portes, le recours,
la restitution et les trois charges séparées.

Verdicts possibles :

- `d10_advantage` ;
- `baseline_advantage` ;
- `compatible_survivors` lorsque les avantages sont croisés ou nuls ;
- `protocol_invalid` si un invariant ou l’oracle échoue.

## Retrait et limites

Retirer le résultat si une paire ne partage pas le même état vrai et le même
budget, si un axe est inactif, si une sortie O1–O4 manque, si l’oracle dépend du
nom du mécanisme ou si l’artefact n’est pas reconstruit à l’identique.

Le protocole ne représente aucune personne, administration ou institution
réelle. Il ne peut établir qu’un résultat interne aux machines d’état
déclarées.
