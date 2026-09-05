# Déclenchement réel — skill de développement `corpus-native-conversation`

## Portée et chargement

Le plugin stable `corpus-11-tools@corpus-11-local` n'a pas été modifié.
Un plugin de développement distinct, version `0.1.0`, a été validé puis
installé et activé depuis le marketplace local :

```text
research/active/model-response-comparison-harness/native_surface/dev-marketplace/.agents/plugins/marketplace.json
```

Codex confirme son état `installed, enabled` sous le nom
`corpus-native-conversation-dev@corpus-native-conversation-dev-local`. Les
tours ont été lancés par une seule demande utilisateur contenant
`$corpus-native-conversation`, sans JSON, sans commande ni manipulation de
paquet côté utilisateur. Ils étaient éphémères, sans API payante ni UI Web.

## Observations

| Run | Question nouvelle | Observation effective | État final |
|---|---|---|---|
| `capacity-read-only` | capacité après retrait d'un modèle organisationnel | le skill est lu depuis le cache Codex, puis `corpus-11-routing` et `autonomous-capacity-gain` sont chargés avant toute restitution | aucun paquet : écriture interdite par le sandbox lecture seule |
| `score-live` | score d'accueil, prime et réponses indues | skill chargé, routage Corpus lu avant restitution, paquet et rendu écrits sous `/tmp/corpus-native-conversation/` | paquet scellé et rendu `standard` vérifiés avec succès |
| `memory-read-only` | dossiers conservés mais accès et transmission perdus | skill chargé, puis gouverneur de routage et routes mémoire/relation sont lus avant toute restitution | aucun paquet : écriture interdite par le sandbox lecture seule |
| `natural-trigger` | délai moyen en baisse après retrait des dossiers complexes | Codex route directement vers `corpus-11-routing`, `construct-validity-assessment` et `real-transformation-assessment` | **le skill de surface n'est pas chargé**, donc aucun paquet ni restitution contrôlée |

Les flux JSONL de `codex exec` se sont terminés avant le message final de
l'agent pour les trois tours. Cette troncature concerne l'observabilité du
client de test, non le seul run écrivable : ses artefacts, créés pendant ce
tour, ont été lus et vérifiés après coup. On ne doit donc pas présenter une
réponse finale interactive comme observée de bout en bout.

Le quatrième tour était volontairement une question naturelle, sans le token
`$corpus-native-conversation`. Il établit une limite importante : la
description actuelle ne suffit pas à faire sélectionner la couche de surface
plutôt que les skills Corpus directs. L'utilisateur n'a pas manipulé de JSON
ni de CLI, mais il devrait actuellement nommer le skill pour obtenir le
workflow scellé.

## Run live attesté

Question brute, conservée textuellement dans le paquet :

> Une coopérative mesure la qualité de son accueil avec un score. Les équipes
> reçoivent une prime si le score monte, mais certains répondent au
> questionnaire à la place des clients. Peut-on dire que la qualité d’accueil
> a augmenté ?

Artefacts :

```text
/tmp/corpus-native-conversation/accueil-score.json
/tmp/corpus-native-conversation/accueil-score.rendered.json
```

Le paquet déclare les routes `causal-identification`,
`construct-validity-assessment`, `strategic-adaptation-assessment` et
`conclusion-discipline`, ainsi que quatre dépendances critiques. Sa conclusion
est prudente : la hausse du score ne suffit pas à établir une hausse de la
qualité. L'incertitude utile et la condition de renversement sont présentes,
mot pour mot, dans le rendu. La vérification déterministe a retourné :

```text
PASS: deterministic conversational render preserves the sealed analytic packet
```

## Échec, interruption et reprise

- **Scellement invalide** : testé au niveau des scripts par les tests qui
  refusent une analyse critique manquante ou dupliquée ; aucun rendu ne peut
  être produit à partir d'un paquet non scellé ou altéré.
- **Sandbox lecture seule** : deux déclenchements réels confirment que le
  workflow ne crée pas de paquet dans ce mode. Le message de refus promis par
  la procédure n'a pas été observé, car le flux Codex s'est arrêté avant la
  phase de scellement.
- **Reprise automatique après interruption** : non établie. Le candidat
  n'implémente actuellement ni identifiant de job ni reprise ; un nouveau tour
  est requis.

## Statut

Statut : **`observed`**, et non `portable` ni `stable`.

Le chargement effectif, l'invocation explicite depuis une demande unique et un
flux complet avec artefacts vérifiés sont observés. Restent à établir :
déclenchement automatique depuis une question naturelle, restitution finale
visible de façon fiable dans le client, plusieurs runs écrivable indépendants
sur des routes distinctes, comportement utilisateur clair après échec de
scellement, et reprise explicite après interruption.
