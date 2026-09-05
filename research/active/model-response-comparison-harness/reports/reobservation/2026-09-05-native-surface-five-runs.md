# Réobservation locale — cinq tâches Codex

## Portée

Exécution locale du workflow décrit par le candidat
`native_surface/corpus-native-conversation/` dans une tâche Codex, le
2026-09-05. Les cinq questions sont nouvelles pour cette passe, non sensibles
et traitées sans API, UI Web ni manipulation de JSON par un utilisateur.

Cette observation exerce les scripts et la procédure de skill depuis le dépôt.
Le skill n'était pas installé dans l'environnement hôte : ce rapport ne prouve
donc pas encore son déclenchement natif à partir d'une interaction utilisateur
ordinaire dans Codex.

## Résultats

| Run | Classe | Routes / dépendances déclarées | Paquet | Rendus vérifiés |
|---|---|---|---|---|
| `capacity` | capacité simple | `autonomous-capacity-gain`, `field-capacity-assessment` | scellé | compact, standard, inspectable |
| `evidence` | dépendance de sources | `evidence-dependence-audit`; `chain-tracing` | scellé | compact, standard, inspectable |
| `transfer` | métrique, adaptation et transfert | `strategic-adaptation-assessment`, `construct-validity-assessment`, `transportability-assessment`; `method-effect-audit` | scellé | compact, standard, inspectable |
| `relation` | objets présents, relations perdues | `difference-remainder-assessment`, `detectability-assessment`, `relation-loss-assessment` | scellé | compact, standard, inspectable |
| `conflict` | recommandations incompatibles | `capability-interference-audit`, `rival-model-discrimination`; `method-effect-audit` | scellé | compact, standard, inspectable |

Les 15 vérifications ont réussi. Chaque paquet a conservé textuellement sa
question brute, conclusion matérielle, incertitudes utiles, conditions de
renversement, routes et dépendances. Chaque restitution contient les trois
champs critiques ; `inspectable` seul expose routes et dépendances.

## Cas sous tension

- **Transfert** : trois bornes distinctes ont dû survivre à la concision :
  score, construit et transport vers la ville cible. Aucun niveau de détail ne
  les a fusionnées.
- **Relation** : la réponse ne pouvait ni appeler les données effacées, ni
  réduire la perte aux seuls objets encore visibles. Les deux incertitudes sont
  restées présentes en compact.
- **Conflit** : la surface n'a sélectionné aucune méthode et n'a pas transformé
  l'absence de discriminant en compromis rhétorique.

## Dérives observées

Aucune dérive de restitution détectée par le contrat déterministe. Aucune route
supplémentaire n'a été ajoutée par la surface : elle lit seulement le paquet
scellé. Le routage lui-même a été produit par l'analyse Codex de cette tâche et
reste une observation de cinq scènes, non une preuve de robustesse générale.

## Limites et statut

Statut global : **`repository-present`**. Les scripts et la procédure ont été
testés sur portée bornée, mais le skill reste non installé et n'a pas été
réobservé comme compétence effectivement déclenchée par une tâche Codex
ordinaire. Il n'est ni portable ni stable.

Avant une promotion : charger le skill dans un environnement de développement,
observer son déclenchement sur de nouvelles tâches sans fuite de la réponse
attendue, tester reprise/échec de scellement, et faire évaluer l'usage par des
personnes nouvelles sans conclure à partir des seules fixtures.
