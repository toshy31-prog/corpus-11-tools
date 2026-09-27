# Revue indépendante RecordLinkage — W4 — 27 septembre 2026

Périmètre : scripts de candidats Python, évaluateur Scout Node et protocole `SOTA_RECORDLINKAGE_W4.md`. Aucun paramètre retouché, aucune installation supplémentaire, aucun appel production. Environnement temporaire RecordLinkage 0.16 fourni par le coordinateur.

## Contrôles réalisés

- Pas de CID ou gold dans les DataFrames d'indexation/comparaison : artiste/titre normalisés et index TID seulement. Les labels voyagent séparément vers l'évaluateur pour le décompte. Référence correcte non injectée; retraits par CID effectués avant indexation.
- Références communes : 7 948. Historique : 1 000 requêtes, 815 présents et 185 absents. Bucket réservé : 1 004 requêtes, 809 présents et 195 absents. Une requête par CID dans chaque ensemble, partition identique aux conditions écrites.
- Comparaison indépendante des normalisations Python et JavaScript sur **38 750 champs artiste/titre** : zéro différence constatée. Les placeholders deviennent ensuite valeurs manquantes dans les deux index.
- Smoke test exécuté via vraies API RecordLinkage : `Björk/Jóga` contre `BJORK/JOGA` retrouve le candidat, similarité moyenne 1; requête sans aucun champ et référence vide ne produisent aucune paire, pour blocking et sorted neighbourhood fenêtre 3. Les vides ne forment pas un faux bloc commun.
- Top10 borné et sans doublons, IDs présents dans le catalogue, départage lexical après similarité. Même scorer de décision sur les sorties des quatre moteurs; ce n'est pas une comparaison entre classifieurs d'identité.

## Reproduction

Le wrapper Node lançant Python a échoué dans cet environnement avec `spawnSync EPERM` malgré une sortie Python produite. Aucun résultat de cette commande n'a été accepté comme exécution réussie. Après ajout du mode stdin par le propriétaire, reproduction sans sous-processus Node :

```sh
set -o pipefail
/tmp/scout-recordlinkage-w4-wu8kXE/venv/bin/python scripts/evaluate-recordlinkage-candidates.py /tmp/scout-external-er-0sYL7Q/musicbrainz-20-A01.csv.dapo | node scripts/evaluate-recordlinkage-scout.mjs --stdin
```

Pipeline terminé code 0, mêmes résultats que le propriétaire :

| Rappel@10, compte brut | RL blocking | RL voisinage 3 | Scout tokens | Scout hybride |
|---|---:|---:|---:|---:|
| Historique, 815 gold présents | 370 | 421 | 779 | 787 |
| Réservé, 809 gold présents | 371 | 437 | 779 | 789 |
| Auto correctes historique | 48 | 48 | 48 | 48 |
| Auto correctes réservé | 62 | 62 | 62 | 62 |

Zéro fausse auto-acceptation observée parmi les présents ou absents dans cette mesure. Les décisions automatiques ne progressent donc pas avec le rappel du générateur. 952/1000 requêtes historiques et 942/1004 réservées restent non automatiques pour chaque méthode.

## Coût et limites du comparateur

Paires RL avant top10 : historique 873 / 4 118; réservé 887 / 4 265. Candidats soumis ensuite au scorer : historique 693 / 3 883 / 8 977 / 9 895; réservé 737 / 4 065 / 9 181 / 9 974. Le plafond de sortie est égal mais pas la consommation interne. Les paires intermédiaires Scout sont `null` (non instrumentées), pas zéro. Les temps incluent recherche/reranking et décision séparément; pas mémoire pic ni protocole stabilisé de latence.

Le blocking exact et une fenêtre 3 sont des baselines économiques étroites. Une faute éloignée dans l'ordre lexical peut sortir de la fenêtre. Les surpasser en rappel ne signifie pas surpasser l'ensemble des configurations RecordLinkage, encore moins l'état de l'art mondial. Augmenter la fenêtre après résultat nécessiterait une nouvelle expérience explicitement nommée, pas remplacer silencieusement celle-ci.

Le bucket réservé était réservé à la mesure W3, **pas un corpus jamais consulté** : W2 pouvait inclure ses CID et toutes ses références avaient pu être indexées. Il n'y a pas entraînement ici, mais ne pas en faire une validation totalement aveugle. DAPO et absences restent artificiels; pas de rappel API YouTube ni de validation audio/versions. Aucun défaut bloquant de mesure relevé après reproduction, aucune recommandation de promotion production automatique.
