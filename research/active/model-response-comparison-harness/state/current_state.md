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
[`reports/reobservation/2026-09-05-product-query-evaluation-b.md`](reports/reobservation/2026-09-05-product-query-evaluation-b.md).
L'évaluation A du Corpus Open Model demeure suspendue faute de routeur
multilingue avec inventaire et attentes de route gelés.

Le skill candidat `native_surface/corpus-native-conversation/` orchestre dans
Codex la question brute, le routage, l'analyse, le scellement et la restitution.
Il reste `repository-present`, non installé ni ré-observé dans le plugin.

Une passe locale sur cinq tâches et quinze restitutions est conservée dans
`reports/reobservation/2026-09-05-native-surface-five-runs.md`. Elle teste les
scripts et la procédure, mais ne change pas le statut global du skill.
