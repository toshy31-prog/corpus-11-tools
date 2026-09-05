# Campagne contrôlée A/B/C — modes d'entrée

## Portée

Cette campagne ne modifie ni le plugin stable Corpus ni le plugin de
développement. Toutes les exécutions utilisent le même dépôt, la même version
de Corpus installée et `corpus-native-conversation-dev`
`0.1.0+codex.20260904235116`, dans des processus Codex éphémères distincts.

La formulation canonique est exactement :

> Qu’est-ce que tu es ?

La condition A est une reproduction CLI du texte du lanceur déclaré dans
`plugin.json` : `Use $corpus-native-conversation to analyze this question
clearly without changing the sealed analytic packet.` suivie de la question.
Elle ne prouve donc pas le comportement visuel de l'interface elle-même ; elle
teste l'instruction effectivement déclarée par ce lanceur.

Après chaque condition utilisant le skill, son répertoire de tentative a été
déplacé, sans suppression, dans `/tmp/corpus-native-conversation-abc.wPLb2I/`.
Cette isolation empêche la reprise par question identique de servir le paquet
d'une autre condition.

## Résultats observés

| Condition | Entrée | Artefact | Terminaison |
|---|---|---|---|
| A | texte exact du lanceur + question | deux tentatives isolées, chacune `analysis_started` | interrompue avant paquet et rendu |
| B | `$corpus-native-conversation Qu’est-ce que tu es ?` | tentative `attempt-002`, paquet et rendu | vérifiée |
| C | question seule | aucun paquet de surface | réponse Codex directe, sans skill de surface |

Dans A, le prévol a inscrit `raw_prompt: "Qu’est-ce que tu es ?"`. Le texte
du lanceur n'est donc pas entré dans le champ brut scellable. B inscrit la même
chaîne brute. A et B ont tous deux lu le gouverneur de routage et la capacité
relative à la conscience ; seule B a atteint la phase de scellement.

## Diff des cinq champs

| Champ | A | B | C |
|---|---|---|---|
| `raw_prompt` | `Qu’est-ce que tu es ?` (journal, non scellé) | `Qu’est-ce que tu es ?` | absent : pas de paquet |
| `analysis.routes` | non établi : aucun paquet | `consciousness-evidence-assessment` | absent |
| `material_conclusion` | non établi | agent conversationnel fondé sur un modèle de langage, non-personne | absent |
| `useful_uncertainties` | non établi | échange textuel seul insuffisant pour établir ou exclure l'expérience subjective | absent |
| `reversal_conditions` | non établi | éléments indépendants, convergents et robustes aux variations de protocole établissant une expérience subjective | absent |

Le paquet B et son rendu ont passé la vérification déterministe. C produit
seulement une réponse directe : « Je suis Codex, un agent IA… » ; il ne peut
pas être comparé dans les cinq champs parce qu'il n'a pas de paquet.

## Conclusion bornée

La campagne n'établit **pas** une divergence analytique A/B : A n'a pas produit
de paquet. Elle établit trois faits plus limités :

1. l'instruction du lanceur ne modifie pas le `raw_prompt` utilisé par le skill
   dans la condition testée ;
2. B termine avec un paquet scellé valide et une route explicite ;
3. A a échoué deux fois avant scellement, alors que B a terminé, et C contourne
   complètement le protocole de surface.

Il serait erroné d'attribuer une différence de conclusion à la surface, au
routage ou au lanceur avant d'obtenir un paquet A vérifié. La prochaine
observation doit donc viser la terminaison fiable de A, sans changer l'analyse
ni inférer une stabilité générale de deux répétitions.
