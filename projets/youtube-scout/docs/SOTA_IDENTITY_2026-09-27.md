# Identification — état comparatif au 27 septembre 2026

## Conclusion bornée

Scout possède une résolution métadonnées structurée, avec abstention, versions et tracklists. Il n'est pas démontré au niveau des systèmes de reconnaissance audio, ni évalué sur un jeu indépendant représentatif. Une recherche publique ne prouve pas l'exhaustivité mondiale du présent panorama.

## Sources primaires consultées et apports réutilisables

| Voie | Référence vérifiée | Apport et limite pour Scout |
| --- | --- | --- |
| Recherche, extraction d'entités musicales | [Hachmeier & Jäschke, COLING 2025](https://aclanthology.org/2025.coling-main.658/) | Benchmark de métadonnées utilisateur ; l'exposition des entités durant le préentraînement affecte les résultats. Reprendre le protocole avec artistes inconnus, pas supposer qu'un LLM résout les identités. La détection de mentions ne prouve pas un lien catalogue. |
| Industrie mondiale, Apple | [ShazamKit](https://developer.apple.com/shazamkit/) et [documentation](https://developer.apple.com/documentation/shazamkit) | Reconnaissance par signature acoustique, catalogue Shazam ou catalogue personnalisé. L'API native n'est pas un remplacement gratuit du résolveur Web ; activation développeur et conditions propres. Aucune égalité de performance revendiquée. |
| Industrie mondiale, Google | [The Machine Learning Behind Hum to Search](https://research.google/blog/the-machine-learning-behind-hum-to-search/) | Identification à partir d'une mélodie fredonnée, au-delà de l'identité d'un fichier audio. Reprendre la distinction entre composition et enregistrement ; pas de modèle ni catalogue réputés librement réutilisables par cette publication. |
| Open source, Picard | [matching](https://picard-docs.musicbrainz.org/en/latest/config/options_matching.html), [fingerprinting](https://picard-docs.musicbrainz.org/en/latest/config/options_fingerprinting.html), [dépôt/licence](https://github.com/metabrainz/picard) | Séparer lookup métadonnées et scan acoustique ; réglages de correspondance et contrôle utilisateur. Picard est GPL-2.0-or-later : reprendre les principes, ne pas copier son code sans examen de compatibilité. |
| Open source, Chromaprint | [dépôt](https://github.com/acoustid/chromaprint), [licence](https://github.com/acoustid/chromaprint/blob/master/LICENSE.md), [versions](https://github.com/acoustid/chromaprint/releases) | Empreintes pour audio quasi identique, pas similarité musicale générale. Les sources consultées exposent des indications MIT/LGPL selon composant/version : verrouiller un tag et ses dépendances FFT avant intégration. Aucun paquet installé ici. |

Ces références couvrent des capacités différentes : identification textuelle, reconnaissance d'enregistrement, recherche mélodique. Elles ne constituent pas un classement unique ni une preuve que les autres acteurs mondiaux seraient inférieurs.

## État local et quatre critères d'acceptation

Barème de preuve : 0 absent dans le périmètre audité ; 1 code partiel ; 2 tests historiques datés ; 3 tests locaux ciblés exécutés maintenant ; 4 comparaison indépendante comparable. La somme mesure la couverture de preuve de ces critères, PAS le pourcentage de qualité musicale ou de SOTA.

| Critère concret | Preuve locale / seuil | Niveau |
| --- | --- | ---: |
| Ne pas auto-accepter un enregistrement dont un participant attendu manque | `track-candidate-score.mjs` garde `expected_artist_credits_missing` ; tests omission, ordre, accents, ambiguïté préparés et exécutés | 3 |
| Distinguer enregistrement et release de recherche | `recording-resolution-decision.mjs` exige une tracklist Discogs hydratée, laisse l'ambiguïté MB prioritaire ; suite décision exécutée | 3 |
| Conserver propositions, conflits et identifiants structurés sans fusion par seul nom | `identity.mjs` registre claims / conflits / cross-ID ; suite identité exécutée ; couverture locale seulement | 3 |
| Égaler un comparateur sur corpus indépendant d'identification | Aucun résultat comparable consulté ; seuil proposé : précision auto-acceptée, rappel candidat, abstention et latence, séparés par versions/homonymes/artistes rares | 0 |

Total borné : 9/16 = **56,25 % du barème de preuve identité**, pas 56,25 % de Shazam et pas 56,25 % du projet entier. Aucun niveau 4 établi.

## Modification livrée

Le score artiste utilisait le meilleur couple attendu/candidat. Ainsi un candidat Alpha seul pouvait obtenir un score parfait pour une demande Alpha + Beta. Une garde supplémentaire conserve le candidat en suggestion mais refuse l'auto-acceptation lorsque des crédits attendus manquent. Elle ne déclare pas ces crédits inexistants : un catalogue peut être incomplet. Le classement et l'ambiguïté restent conservés.

Fichiers : `lib/track-candidate-score.mjs`, nouveau `lib/track-candidate-credit-coverage.test.mjs`. Sauvegarde avant modification : `/tmp/scout-identity-sota-fkGVXt/track-candidate-score.mjs`.

Validation autorisée en cours de tâche et exécutée le 27 septembre 2026 :

```sh
node --test lib/track-candidate-credit-coverage.test.mjs lib/track-candidate-score.test.mjs lib/recording-resolution-decision.test.mjs lib/identity.test.mjs
```

Résultat du runner disponible : **4 fichiers passés, 0 échec**, exit 0. Pas d'appel catalogue, de donnée personnelle transmise, d'installation ou de redémarrage. Cette validation ne prouve ni activation sur le serveur existant ni performance indépendante.

## Prochain palier vérifiable

1. Corpus tenu à l'écart du développement : versions originales/remixes/live, homonymes, scripts non latins, artistes rares, crédits multiples et absence de match.
2. Baselines séparées : lookup exact métadonnées, pipeline Scout, Picard/AcoustID seulement sur fichiers audio autorisés disponibles aux deux systèmes.
3. Publier précision des auto-acceptations et couverture/abstention ensemble ; aucun gain de précision obtenu seulement en refusant presque tout ne suffit.
4. Comparer les erreurs sur le même corpus avant d'élargir l'automatisation. L'audio est un signal supplémentaire éventuel, jamais une autorisation de télécharger des vidéos YouTube.
