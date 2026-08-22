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

## Contrat de non-interférence

La surface conversationnelle intervient **après** le routage et le travail
analytique. Elle n'est ni un préprocesseur de la demande, ni un routeur bis.

```text
demande originale complète
→ routage Corpus
→ capabilities et dépendances pertinentes
→ travail analytique
→ surface conversationnelle
→ restitution et choix utilisateur
```

À demande et preuves identiques, ajouter cette surface ne doit modifier ni les
routes pertinentes, ni les dépendances critiques, ni la conclusion matérielle,
ni les conditions de renversement. Elle peut seulement modifier :

- la formulation publique ;
- l'ordre d'exposition, sans le transformer en ordre d'autorité ;
- le degré de détail visible ;
- les contrôles proposés à l'utilisateur pour inspecter, interrompre ou reprendre.

La demande brute ne doit donc pas être réduite à une intention, un mode, un
formulaire ou un résumé avant le routage. Une capability pertinente peut rester
invisible dans la restitution sans devenir inactive. Une clarification n'est
requise que si sa réponse peut modifier matériellement le routage ou l'action.

Lorsque plusieurs conclusions restent soutenues, la surface conserve leur
pluralité en langage ordinaire. Elle expose les preuves discriminantes et les
conditions de révision utiles ; elle ne fabrique ni graphe obligatoire, ni score,
ni synthèse présentée comme neutre.

## États perceptibles

La restitution distingue au minimum :

- compris ou supposé ;
- proposé ;
- écrit ;
- testé ;
- autorisé ;
- exécuté ;
- déployé ;
- réobservé ;
- inconnu ou indisponible.

Ces états ne sont pas une progression automatique. Une action annoncée doit
produire un effet observable ou une indisponibilité expliquée.

## Évaluations candidates

Le jeu apparié
[`conversational-corpus-surface-evals.jsonl`](conversational-corpus-surface-evals.jsonl)
compare une demande brute et sa restitution médiée sur des scènes simples,
ambiguës, composites, indirectes, conflictuelles et de reprise.

Pour chaque paire, l'audit doit vérifier :

1. identité des routes matériellement pertinentes ;
2. conservation des dépendances critiques ;
3. identité de la conclusion matérielle et de ses bornes ;
4. conservation des divergences non discriminées ;
5. absence d'activation ou d'omission causée par l'ordre d'exposition ;
6. absence de taxonomie imposée lorsque son exposition n'aide aucun choix.

Ces fichiers définissent un protocole candidat. Ils ne constituent pas encore
un exécuteur automatisé ni une validation multi-utilisateur.

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
- réobservation appariée des évaluations de non-interférence ;
- mesure des omissions, activations supplémentaires et effets d'ordre ;
- reprise après interruption sans perte de la question, des relations acquises
  ou des conditions de renversement.

## Condition d’acceptation ou de retrait

Accepter comme contrat produit seulement si ces observations montrent une réduction reproductible de charge sans perte de contrôle, de traçabilité ou de qualité analytique. Retirer le candidat s’il ne change aucun comportement du routeur ou si l’usage direct de Codex satisfait déjà ces conditions sans couche supplémentaire.
