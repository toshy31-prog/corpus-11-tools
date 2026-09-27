# Identité W5 — pourquoi seulement 6,18 % automatiques ?

27 septembre 2026. Diagnostic descriptif du protocole W4 gelé, sans changement de seuil, de score, de candidats ou de données. Instrumentation nouvelle seulement ; aucune intégration en production.

## Résultat mesuré

Sur les 1 004 requêtes du lot réservé par W3, Scout hybride accepte automatiquement 62 correspondances correctes, soit 6,18 %. Aucune acceptation erronée observée. Ce lot n'est pas un corpus aveugle indépendant : certains CID ont pu apparaître dans W2. Le corpus Leipzig MusicBrainz20K contient des corruptions synthétiques, pas des jugements humains sur des vidéos YouTube.

Partition exclusive de toutes les requêtes, dans cet ordre :

| État constaté | Nombre | Sens |
|---|---:|---|
| Vraie référence volontairement absente du catalogue | 195 | L'abstention est attendue |
| Référence présente mais absente des dix candidats | 20 | Limite du retrieval |
| Vraie référence retrouvée mais pas première après scoring | 103 | Désaccord de classement |
| Première référence correcte, score inférieur à 0,78 | 519 | Rejet du score actuel |
| Première référence correcte, score de 0,78 à moins de 0,90 | 105 | Suggestion, pas automatisation |
| Première référence correcte, frein de marge/garde à score ≥0,90 | 0 | Pas le facteur limitant observé ici |
| Acceptation correcte automatique | 62 | Résultat final |
| **Total** | **1 004** | **942 décisions non automatiques** |

Le retrieval trouve 789/809 vraies références disponibles. Il n'explique donc pas seul la faible automatisation : 624 requêtes ont déjà la bonne référence en tête mais son score reste sous le seuil automatique. Ces catégories ne prouvent pas qu'assouplir les seuils serait sûr : le même changement s'appliquerait aux 103 mauvais premiers candidats et aux 195 absences.

Les raisons effectivement retournées sont : `no_plausible_identity_match` 831, `credible_but_not_decisive` 106, `no_candidates` 5, `high_score_and_clear_gap` 62. Elles ne se confondent pas avec les catégories précédentes, qui emploient les labels externes uniquement après décision.

## Métadonnées et composantes observées

Parmi les 624 premiers candidats corrects non automatiques : 432 portent la pénalité `title_mismatch`, 108 `artist_mismatch` ; 104 ont un artiste de référence manquant. Le composant titre est inférieur à 0,45 dans 343 cas, contre 244 pour le composant artiste. Ces indicateurs se chevauchent et ne sont pas des causes exclusives.

Sur les 942 requêtes non automatiques, 205 ont un artiste de requête manquant et cinq un titre manquant. La fixture minimale testée confirme qu'un titre exact sans artiste ne suffit pas à déclencher une acceptation automatique, tandis que Björk/Jóga et Bjork/Joga concordants sont acceptés. Cela confirme le contrat du score, pas la qualité de toutes ses abstentions.

Version, catalogue et durée sont indisponibles dans les 624 cas ci-dessus : **l'adaptateur W4 ne transmet que titre/artiste**, pas tous les champs du CSV. `source: unknown` est fixé pour tous les comparateurs. On ne peut donc attribuer leurs performances aux autres métadonnées, ni annoncer un gain en les renseignant sans une nouvelle expérience préenregistrée. Aucun prior, poids ou seuil n'a été changé.

Contrôle historique W3 : 1 000 requêtes = 185 absentes + 28 non retrouvées + 116 mauvaises premières + 513 bonnes premières sous 0,78 + 110 bonnes premières sous 0,90 + 48 automatiques. Le diagnostic reproduit exactement les totaux W4.

## Reproduction et validation

Nouveaux fichiers : `scripts/diagnose-identity-w5.mjs` (module pur + lecture JSON sur stdin) et `scripts/diagnose-identity-w5.test.mjs`. Trois tests déclarés, agrégés par l'environnement en un fichier TAP : code 0, un fichier passé, zéro échec. Le test couvre les sept branches de partition, un cas minimal accent/champ manquant et le refus de labels de vérité manquants/vides. Le programme vérifie la somme de la partition. La revue indépendante a signalé le risque `undefined === undefined` ; l'instrumentation refuse désormais les labels CID absents et les indicateurs d'absence non booléens avant calcul.

```sh
node --test scripts/diagnose-identity-w5.test.mjs
set -o pipefail
env -i PATH=/usr/bin:/bin OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 /tmp/scout-recordlinkage-w4-wu8kXE/venv/bin/python scripts/evaluate-recordlinkage-candidates.py /tmp/scout-external-er-0sYL7Q/musicbrainz-20-A01.csv.dapo | env -i PATH=/usr/bin:/bin /usr/bin/node scripts/diagnose-identity-w5.mjs
```

Pipeline exécuté hors réseau, code 0. Corpus, hash, attribution, licence et protocole identiques à `SOTA_RECORDLINKAGE_W4.md`. Aucun téléchargement, installation, réglage sur réserve ou écriture dans les données.

## Prochaine tâche bornée recommandée

Préenregistrer un protocole distinct d'enrichissement de métadonnées : vérifier d'abord la sémantique et le taux de disponibilité de `length` et des identifiants de catalogue du CSV, puis comparer un adaptateur enrichi au titre/artiste seul **sur une évaluation nouvelle réellement indépendante**. Ne pas apprendre des seuils sur cette réserve déjà examinée. La priorité immédiate n'est pas de baisser 0,90 : elle est de comprendre et préserver les informations utiles avant de qualifier la sûreté d'une automatisation supplémentaire. Aucun palier SOTA n'est démontré par ce diagnostic.

## Sources primaires revérifiées le 27 septembre 2026

- Recherche : [SelectiveNet, ICML 2019](https://proceedings.mlr.press/v97/geifman19a.html) formalise l'arbitrage risque/couverture avec abstention. C'est un fondement historique, pas une nouveauté 2026, et son réseau n'est pas implanté dans Scout. [Comparaison reproductible de blocking, NAACL 2024](https://aclanthology.org/2024.naacl-long.483/) fournit une référence de protocole comparatif ; ses scores ne sont pas directement transférables à notre lot musical.
- Industrie mondiale : [AWS Entity Resolution](https://docs.aws.amazon.com/entityresolution/latest/userguide/what-is-service.html) décrit un service de rapprochement, pas une baseline locale mesurée ici. Aucune donnée envoyée, aucun compte/API activé. [Megagon Labs / Ditto](https://github.com/megagonlabs/ditto) propose la classification de paires par modèle préentraîné, distincte du retrieval ; code Apache-2.0, dépendances et poids à auditer séparément avant adoption. Aucun modèle téléchargé.
- Open source réellement comparé : [RecordLinkage, indexation officielle](https://recordlinkage.readthedocs.io/en/latest/ref-index.html). W4 mesure blocking et sorted-neighbourhood fenêtre 3 puis Jaro-Winkler ; ce sont des configurations classiques figées, pas le meilleur réglage possible de l'outil. Leur rappel@10 réservé est 371/809 et 437/809 contre 789/809 pour Scout hybride, mais les quatre méthodes aboutissent aux mêmes 62 acceptations correctes avec le score Scout commun. Ce résultat justifie de diagnostiquer la décision, pas de déclarer l'identité SOTA.

Pour une revendication SOTA manquent notamment un test neuf réellement indépendant, des comparateurs modernes de matching évalués au même budget, une mesure risque/couverture sur vérité métier pertinente et une observation en production. Le présent lot ne remplit pas ces conditions.
