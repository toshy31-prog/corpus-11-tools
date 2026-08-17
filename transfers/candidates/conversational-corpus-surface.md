# Surface conversationnelle Corpus — candidat

Statut : **candidat extrait d’un prototype abandonné ; cohérence interne soutenue, validation multi-utilisateur absente**

Recherche source : `research/completed/corpus-ui-workspace/`

## Problème observé

La taxonomie et les mécanismes de Corpus sont utiles au raisonnement mais deviennent une barrière lorsqu’ils constituent la porte d’entrée. Les retours répétés de l’utilisateur principal ont montré quatre classes d’échec : collecte initiale trop longue, actions sans effet réel, workflow incomplet ou invisible, et confusion entre catégories internes et gestes ordinaires.

## Mécanisme proposé

Faire de la conversation libre la surface utilisateur canonique et traiter la structure Corpus comme une compilation inspectable en arrière-plan.

1. Conserver la demande initiale, les termes, la tension ouverte et les choix non résolus.
2. Autoriser une entrée brève sans formulaire ni connaissance préalable de Corpus.
3. Router vers le sous-ensemble minimal de skills, sources, simulateurs et représentations pouvant changer un élément matériel de la réponse.
4. Restituer en langage ordinaire ; exposer la méthode, la provenance et la taxonomie sur demande ou lorsqu’elles changent la décision.
5. Séparer proposition, conservation durable, exécution, résultat, conclusion et production.
6. Exiger un effet observable ou une indisponibilité expliquée pour toute action présentée.
7. Maintenir une surface technicienne distincte pour permissions, versions, tests, traces et déploiements.
8. Permettre refus, suppression, retour et reprise rapide sans vocabulaire spécialisé.

## Ce qui a été retiré du contexte

- composants React et choix graphiques ;
- serveur Vinext et hébergement ;
- passerelle HTTP locale et protocole de démarrage ;
- catégories propres au prototype ;
- hypothèse qu’un tableau de bord autonome est nécessaire.

## Appuis déjà présents dans Corpus

- préservation de l’agence et de la scène utilisateur ;
- routage minimal par changement matériel possible ;
- distinction des statuts de preuve et de changement ;
- séparation entre présence, disponibilité, exécution et vérification ;
- arrêt lorsque la médiation supplémentaire ne peut plus changer la conclusion.

Ce candidat ne crée donc pas un nouveau skill. Il propose un contrat de surface transversal pour l’usage conversationnel des capacités existantes.

## Validation manquante

- observation de plusieurs personnes nouvelles utilisant Corpus directement dans Codex ;
- comparaison à tâche égale avec et sans explicitation de la structure ;
- mesure du temps avant première action utile, des demandes de clarification et des abandons ;
- test de reprise après interruption ;
- vérification que la taxonomie reste accessible sans redevenir envahissante.

## Condition d’acceptation ou de retrait

Accepter comme contrat produit seulement si ces observations montrent une réduction reproductible de charge sans perte de contrôle, de traçabilité ou de qualité analytique. Retirer le candidat s’il ne change aucun comportement du routeur ou si l’usage direct de Codex satisfait déjà ces conditions sans couche supplémentaire.
