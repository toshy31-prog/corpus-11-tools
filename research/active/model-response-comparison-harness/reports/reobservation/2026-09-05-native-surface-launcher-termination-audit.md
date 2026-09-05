# Audit de terminaison — chemin lanceur A

## Portée

Aucun plugin ni code produit n'a été modifié. L'audit porte sur la campagne
A/B/C et sur les exécutions Codex CLI éphémères correspondantes.

## Chaîne attestée

| Élément | A | B |
|---|---|---|
| environnement | même dépôt, même plugin dev et Corpus, `workspace-write` + `/tmp` | idem |
| prévol `prepare` | réussi | réussi |
| `start` | réussi, état `analysis_started` | réussi |
| routage | `corpus-11-routing` lu | `corpus-11-routing` lu |
| capacité conscience | lue | lue |
| paquet/rendu | absents | présents et vérifiés |

Le dernier événement attesté pour A est la lecture complète des instructions
de capacités après `analysis_started`. L'étape attendue suivante était la
synthèse de l'analyse, puis `conversation_run.py complete`; aucune de ces deux
actions n'apparaît. Les deux tentatives A ont seulement `job.json` avec l'état
`analysis_started` : aucun paquet partiel, rendu partiel ou fichier de
scellement n'existe.

## Causes écartées et inconnues

- **Écriture** : écartée sur portée testée. `prepare` et `start` écrivent bien
  sous `/tmp`; B y a écrit puis vérifié paquet et rendu.
- **Erreur de scellement/rendu** : non attestée. A n'a jamais appelé
  `complete`.
- **Crash de l'application** : non attesté. Le seul rapport de crash local est
  un crash GPU antérieur au 26 août, sans corrélation temporelle.
- **Exception ou timeout précis** : non établi. Le flux `codex exec` s'arrête
  sans `turn.completed`, sans erreur d'outil et sans message final de l'agent.

La meilleure localisation actuelle est donc : interruption du client ou de la
boucle d'exécution **après chargement des références Corpus et avant la
synthèse/commande `complete`**. Cela ne permet pas d'attribuer la cause au
lanceur, au routeur ou à la surface.

## Reprise

Le journal local préserve correctement l'interruption. Il ne reprend pas une
analyse au milieu : une nouvelle préparation pour la même question crée une
nouvelle tentative. C'est ce qui empêche l'écrasement, mais ne fournit pas de
callback automatique capable d'afficher une erreur après la disparition du
client. Le comportement « ne pas afficher une réponse normale » est observé
(A n'en a pas affiché), mais le signal utilisateur explicite après interruption
n'est pas établi.

## Lanceur UI réel

L'application ChatGPT/Codex est ouverte localement. La documentation officielle
décrit `default_prompt` comme le texte d'encadrement facultatif d'un skill dans
l'interface de bureau. Cette session n'a toutefois ni connecteur de contrôle
de l'application Electron, ni outil graphique de capture/clic : le test A
effectué est une reproduction CLI du texte du lanceur, pas une observation du
clic UI.

Le test « clic Corpus Native Conversation Dev → question → paquet → rendu »
reste donc **non établi**, et exige une surface de contrôle UI ou une exécution
manuelle observable dans l'application. Il ne faut pas le remplacer par une
conclusion à partir des seuls résultats CLI.
