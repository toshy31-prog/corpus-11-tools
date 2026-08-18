# Adaptateurs scientifiques

Ces modules appliquent le Corpus Experiment Lab à des hypothèses particulières. Ils ne font pas partie du moteur générique.

- `plugins/` : sémantiques de récupération/effacement, temporalité et factorisation ;
- `scientific/` : modèles et contrôles propres aux hypothèses ; les exécutions
  prédictive et d’ablation écrivent leurs quatre artefacts scientifiques, les
  trois exécutions compatibles leurs deux artefacts, puis toutes délèguent
  vérification, hachage et attestation à `execution-closure.mjs` ;
- `prospective/` : protocoles et résultats gelés ;
- `governance/` : adaptateurs qui déclarent les fichiers et artefacts propres à une expérience, puis délèguent verrouillage et attestation au laboratoire Corpus ;
- `runners/` et `tests/` : réexécution et non-régression de la recherche ;
- `outputs/` et `fixtures/` : résultats attendus et artefacts de comparaison.

Leur présence établit une recherche reproductible sur un périmètre fini, pas une capability universelle de Corpus.
