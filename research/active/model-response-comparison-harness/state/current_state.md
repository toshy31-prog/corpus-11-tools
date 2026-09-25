# État courant

Le jalon 1 est écrit et vérifié sur fixtures synthétiques : création de run,
scellement des entrées et sorties, journal chaîné, tentative explicite,
anonymisation A/B et refus de comparaison prématurée ou corrompue.

Le jalon 2 est autorisé une fois : le premier run réel explicitement classé
`non_sensitive`, entre `chatgpt_custom_gpt` et `codex_corpus`, sans API ni
confrontation réciproque. Le manifest déclare la session GPT fraîche et sa
configuration propre, ainsi que le contexte local chargé de Corpus.

## Prochaine décision

Sceller séparément les deux réponses au premier prompt réel, puis produire le
paquet de revue A/B. La politique de coût interdit toute intégration API et
tout achat de crédits sans une nouvelle autorisation explicite de l'utilisateur.

## Réorientation produit

La priorité est une surface conversationnelle native Codex au-dessus de Corpus.
Le contrat candidat `conversational-corpus-surface` est la référence de
non-interférence. Le pont `chatgpt_custom_gpt` est en pause, sans suppression ;
le harness devient un instrument R&D qui vérifie que la restitution simple ne
change ni route, ni conclusion, ni incertitude matérielle.

Le premier candidat exécutable est `native_surface/` : il accepte uniquement un
paquet Corpus scellé et conserve textuellement conclusion, incertitudes utiles
et conditions de renversement sous trois niveaux de détail.

L'évaluation B pré-enregistrée des requêtes produit a rendu et vérifié 54
restitutions à partir de 18 paquets fictifs scellés, sans routeur ni modèle.
Son statut est `pipeline_verified` dans cette portée ; voir
[`reports/reobservation/2026-09-05-product-query-evaluation-b.md`](../reports/reobservation/2026-09-05-product-query-evaluation-b.md).
L'évaluation A du Corpus Open Model est désormais `pipeline_verified` dans sa
portée fermée : trois champs déclaratifs exacts sur 18 requêtes synthétiques
gelées ; voir le
[rapport A](../../corpus-open-model/reports/2026-09-05-product-query-evaluation-a-pipeline-verified.md).
Ce statut n'établit ni qualité générale de routage, ni gain neural, ni
intégration produit.

Le skill candidat `native_surface/corpus-native-conversation/` orchestre dans
Codex la question brute, le routage, l'analyse, le scellement et la restitution.
Sa copie de recherche reste `repository-present`. La disponibilité du plugin
de développement est distincte ; voir ci-dessous.

Une passe locale sur cinq tâches et quinze restitutions est conservée dans
`reports/reobservation/2026-09-05-native-surface-five-runs.md`. Elle teste les
scripts et la procédure, sans établir une intégration à la release principale.

## Disponibilité observée le 19 septembre 2026

- **Dépôt de recherche** : `native_surface/` contient le renderer, les scripts
  et le skill candidat. Cette présence seule ne prouve pas leur chargement.
- **Plugin de développement** : `corpus-native-conversation-dev`, version
  `0.1.0+codex.20260904235116`, expose le skill `corpus-native-conversation`
  dans la session Codex de cette observation. Son manifeste local a été lu ;
  aucune installation ni invocation du skill n’a été effectuée ici.
- **Release principale** : le plugin de développement est un paquet distinct
  de `corpus-11-tools`. Cette observation n’établit pas l’intégration du
  candidat à la release principale ni sa stabilité.

Le [rapport de déclenchement du 5 septembre](../reports/reobservation/2026-09-05-native-surface-real-skill-trigger.md)
documente un chargement réel du plugin de développement et un paquet vérifié,
avec des limites sur le déclenchement naturel et la restitution finale visible.
Il s’agit d’un résultat historique, non d’un test relancé le 19 septembre.
La disponibilité actuelle ne constitue ni une nouvelle évaluation du routage,
ni une preuve de gain analytique ou de fonctionnement de bout en bout.
