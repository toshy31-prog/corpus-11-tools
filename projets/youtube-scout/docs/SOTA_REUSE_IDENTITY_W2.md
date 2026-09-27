# Identité — réemploi borné, vague 2, 27 septembre 2026

## Mécanisme et défaut établi

La prédiction sélective évalue conjointement erreurs parmi les décisions automatiques et couverture, et non le seul taux d'abstention : [SelectiveNet, ICML 2019](https://proceedings.mlr.press/v97/geifman19a.html), source primaire relue aujourd'hui. Nous réemployons ce principe d'évaluation, **pas son réseau neuronal**, ni une revendication de dernier classement mondial. Les scores heuristiques locaux ne sont pas des probabilités calibrées.

Les [règles MusicBrainz Recording](https://musicbrainz.org/doc/Style/Recording) distinguent notamment remixes et enregistrements originaux. Résultat de recherche primaire consulté ; réouverture de la page limitée par HTTP 429 aujourd'hui. Les références chercheurs, Apple/Google et logiciels libres de la première vague restent détaillées dans `SOTA_IDENTITY_2026-09-27.md` ; aucun code tiers ou modèle repris dans ce correctif.

Baseline sauvegardée : `/tmp/scout-identity-w2-PN8tdk/track-candidate-score.mjs`. Une demande « Original Mix », artiste/titre/durée/catalogue identiques, acceptait automatiquement un candidat explicitement « Live » (score 0,9243) ou « Radio Edit » (0,933). La pondération faible de version permettait aux autres composantes de compenser une contradiction de version. Le garde spécialisé Discogs était plus strict ; MusicBrainz restait exposé.

## Changement

Dans `lib/track-candidate-score.mjs`, avant auto-acceptation, deux versions explicitement renseignées dont la similarité est inférieure à 0,95 produisent une **suggestion conservée**, motif `explicit_version_requires_verification`. Le seuil reprend la compatibilité déjà exigée par le garde Discogs. Classement, candidats et scores ne sont pas modifiés. Une version absente reste inconnue : aucun rejet automatique supplémentaire pour absence de métadonnée. Les crédits incomplets restent gardés par le correctif de vague 1.

## Comparaison adverse contrôlée

Même fixture synthétique, même catalogue et même durée, artiste `Múm` contre `Mum` :

| Sous-ensemble | Baseline | Après |
|---|---|---|
| Live, Radio Edit, Other Remix (3 contradictions) | 3 auto-acceptations erronées | 3 suggestions, 0 auto-acceptation |
| Original Mix, original-mix, Óriginal Mix (3 équivalences normalisées) | 3 auto-acceptations | 3 auto-acceptations |
| Version fournisseur absente (1 inconnue) | auto-acceptation | auto-acceptation inchangée |

La couverture automatique des trois cas positifs reste 3/3 ; baisse globale de couverture ciblée sur les contradictions, pas succès obtenu en refusant tout. Ce micro-jeu est construit autour du défaut, non indépendant : il ne mesure ni précision mondiale ni risque réel de production. Les homonymes de titre avec mauvais artiste et deux rivaux égaux sont également couverts dans le nouveau test.

## Validation et limites

Commande isolée : `node --test lib/track-candidate-version-selectivity.test.mjs lib/track-candidate-credit-coverage.test.mjs lib/track-candidate-score.test.mjs lib/recording-resolution-decision.test.mjs lib/identity.test.mjs` : **5 fichiers passés, 0 échec**, exit 0, le 27 septembre 2026. Comparaison avant/après exécutée séparément sur les sept variantes avec imports baseline et patch. Aucun réseau dans les tests, aucune installation ni activation de service.

Des alias sémantiques de versions non normalisés peuvent rester suggestions ; une version absente peut encore masquer une contradiction. Les rôles crédités (remixeur versus artiste principal) ne sont pas inférés ici. Prochaine preuve indispensable : jeu indépendant annoté avec versions/homonymes, courbes risque-couverture et sous-groupes, sans changer les seuils après consultation du test final. Le palier SOTA n'est pas établi par cette correction.
