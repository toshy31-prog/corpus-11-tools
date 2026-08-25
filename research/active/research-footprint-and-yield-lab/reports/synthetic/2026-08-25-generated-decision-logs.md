# Résultat — journaux de décision générés

- Portée : `pipeline_verified`.
- Protocole fixé avant exécution : oui.
- Générateur et paramètres : deux journaux fictifs, états avant/après, question,
  sorties, jetons, minutes, appels et porteurs de charge.
- Invariants : appariement exact avant comparaison, unités séparées et
  conservation du contrôle à rendement nul.
- Baseline : 1 200 jetons, 38 minutes, 6 appels, 1 décision changée,
  2 sorties uniques, 1 événement à rendement nul.
- Structuré : 900 jetons, 32 minutes, 5 appels, 1 décision changée,
  2 sorties uniques, aucun événement nul.
- Porteurs de charge : conservés séparément dans chaque journal.
- Appariement : même `question_id=question-retain-a-v1`, mêmes états initial et
  final et même ensemble exact de sorties. Les mutations de question et de
  sortie sont toutes deux rejetées avant comparaison.

Conclusion : le protocole structuré domine les trois coûts dans cette paire
seulement. Les anciennes valeurs `decisions_changed` fournies n’étaient pas un
oracle indépendant. La revendication antérieure de question appariée sans champ
correspondant est retirée; l'identité est maintenant exécutable.

- Effet possible du protocole : les journaux fixent à la fois coûts et sorties.
- Condition de retrait : question, états ou sorties non appariés, unité agrégée
  silencieusement ou événement nul supprimé.
