# Comparateur indépendant RecordLinkage W4 — protocole avant mesure

27 septembre 2026. Installation temporaire autorisée et gérée exclusivement par le coordinateur. Aucun branchement production, apprentissage, ajustement du scorer ni téléchargement de corpus supplémentaire.

## Protocole figé

Corpus Leipzig20K CC BY4, hash `527a94f24f7e813a9bc3fef35a635f13e195516966b308140a0dd2926afbb97d` ; attribution/manifeste dans `SOTA_EXTERNAL_IDENTITY.md`. Références et retraits identiques W3 : première ligne par CID, retrait si second octet SHA256(CID) modulo5=0. Deux ensembles séparés : W3 historique (1000 premiers CID dupliqués dont premier octet modulo5 !=0, ordre hash) et réservé (tous les CID dupliqués de bucket0, ordre hash). Une requête par CID, deuxième ligne ; aucun gold injecté.

Comparateurs indépendants fixés : RecordLinkage `Index.block` union artiste/titre et `Index.sortedneighbourhood(window=3)` union artiste/titre. Champs normalisés accents, casse, ponctuation comme Scout ; valeurs absentes/unknown exclues de l'indexation, sans bloquer ensemble les vides. Paires rerankées par moyenne simple des deux similarités Jaro-Winkler de `Compare.string`, valeur absente0 ; départage identifiant lexical, top10. Baselines Scout tokens et hybride inchangées. Gold/CID sert seulement à la sélection protocolaire et mesure, jamais index/rerank.

API primaire lue : [indexing](https://recordlinkage.readthedocs.io/en/latest/ref-index.html), [comparing](https://recordlinkage.readthedocs.io/en/latest/ref-compare.html). L'union des index et fenêtre3 sont explicitement documentées. Code outil BSD3-Clause ; versions installées seront rapportées séparément par le coordinateur.

Mesures fixées : rappel@1/5/10 sur gold présents, nombre total de paires produites et top10 transmis, temps construction/recherche, décisions du **même scorer Scout** sur chaque top10, fausses acceptations parmi gold présents et absents, couverture automatique. Même budget sortie10, mais coûts internes différents explicitement comptés. Comparer aussi un classifieur de RecordLinkage n'est pas cette expérience.

Limites prévues : réservé signifie requêtes CID non mesurées W3, non données entièrement inconnues (leurs références étaient indexées). DAPO est un bruit synthétique. Aucune extrapolation vers un niveau SOTA mondial, ni vers performances APIs réelles.

## Résultats exécutés

RecordLinkage **0.16**, environnement `/tmp/scout-recordlinkage-w4-wu8kXE/venv/bin/python` installé par le coordinateur. Versions/URLs/hashes disponibles dans son `install-report.json` et verrou de dépendances `scripts/recordlinkage-w4-requirements.txt`. 7 948 références pour toutes les méthodes.

### Historique W3 — 1 000 requêtes, 815 présentes / 185 absentes

| Méthode | R@1 | R@5 | R@10 | Auto correctes | Auto erronées présent/absent | Paires produites / candidats transmis |
|---|---:|---:|---:|---:|---|---|
| RecordLinkage block | 359 | 369 | 370/815 | 48 | 0 / 0 | 873 / 693 |
| RecordLinkage sorted-neighbourhood3 | 400 | 419 | 421/815 | 48 | 0 / 0 | 4 118 / 3 883 |
| Scout tokens | 720 | 771 | 779/815 | 48 | 0 / 0 | non instrumentées / 8 977 |
| Scout hybride | 722 | 780 | 787/815 | 48 | 0 / 0 | non instrumentées / 9 895 |

### Réserve W3 — 1 004 requêtes, 809 présentes / 195 absentes

| Méthode | R@1 | R@5 | R@10 | Auto correctes | Auto erronées présent/absent | Paires produites / candidats transmis |
|---|---:|---:|---:|---:|---|---|
| RecordLinkage block | 358 | 370 | 371/809 =45,86% | 62 | 0 / 0 | 887 / 737 |
| RecordLinkage sorted-neighbourhood3 | 409 | 436 | 437/809 =54,02% | 62 | 0 / 0 | 4 265 / 4 065 |
| Scout tokens | 734 | 775 | 779/809 =96,29% | 62 | 0 / 0 | non instrumentées / 9 181 |
| Scout hybride | 738 | 781 | 789/809 =97,53% | 62 | 0 / 0 | non instrumentées / 9 974 |

**Conclusion bornée :** meilleur rappel de récupération pour Scout que ces deux configurations classiques exécutées indépendamment. Ce n'est ni une victoire contre RecordLinkage optimisé ni un palier SOTA. Fenêtre3 est une baseline fixée, pas son optimum. Même couverture automatique **62/1 004=6,18%** pour les quatre méthodes, donc **942 décisions non automatiques** ; le gain de récupération n'est pas un gain automatique de résolution. Aucun seuil/paramètre n'a changé après mesure.

### Coût de cette exécution

Réserve : construction/recherche/reranking RecordLinkage block18,8ms, SN3 70,1ms ; Scout tokens211,9ms, hybride1 425,9ms. Décision commune ensuite :24,7/115,2/235,2/264,9ms respectivement. Historique : retrieval21,1/48,4/206,2/1 421,1ms, décision35,7/122,7/236,4/256,1ms. Les paires internes Scout ne sont pas instrumentées : `null`, jamais interprété comme zéro. Limite sortie10 identique, **pas budget calcul égal** ; les outils produisent des listes de tailles différentes. Les temps excluent démarrage Python/imports/lectureCSV/transportJSON et ne sont pas une latence produit stabilisée.

## Reproduction vérifiée (exit0)

```sh
set -o pipefail
env -i PATH=/usr/bin:/bin OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 /tmp/scout-recordlinkage-w4-wu8kXE/venv/bin/python scripts/evaluate-recordlinkage-candidates.py /tmp/scout-external-er-0sYL7Q/musicbrainz-20-A01.csv.dapo | env -i PATH=/usr/bin:/bin /usr/bin/node scripts/evaluate-recordlinkage-scout.mjs --stdin
```

Le lancement initial Node `execFileSync` a échoué par EPERM du contexte malgré stdout enfant, et n'a pas été compté comme succès. Mode `--stdin` et pipeline shell ajoutés sans modification de l'algorithme, puis exécution complète exit0. L'agent de revue confirme indépendamment que les valeurs absentes `None` n'engendrent pas de bloc commun vide, pour block comme SN3.

Important : le bucket0 était réservé à **W3**, mais les requêtes W2 triées parTID pouvaient en inclure des CID. Il n'est donc pas totalement aveugle ni un corpus neuf indépendant. Références déjà présentes et revue du corpus antérieure ; aucune revendication de performance sur données jamais vues. Nouveau corpus et protocole réellement tenu à l'écart nécessaires avant promotion.

Prochaine étape recommandée : mesurer paires et coûts comparables, puis protocole indépendant pour configurations classiques plus larges, sans régler sur ces deux ensembles désormais consultés. Aucun déploiement réalisé.
