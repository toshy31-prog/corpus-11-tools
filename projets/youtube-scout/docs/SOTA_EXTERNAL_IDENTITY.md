# Sonde extérieure d'identité — 27 septembre 2026

## Résultat mesuré

Sur les **mêmes 1 000 requêtes et 10 000 candidats**, Scout accepte automatiquement 80 identités correctes (8 % de couverture), contre 49 (4,9 %) pour égalité artiste/titre normalisés. Aucune fausse auto-acceptation observée dans cette sonde ; **92 % des requêtes restent non automatiques**. Ce résultat ne démontre pas un palier SOTA, ni une précision future de 100 %.

| Décision | Scout pré-W2 | Scout W2 | Égalité normalisée |
|---|---:|---:|---:|
| Auto correcte | 80 | 80 | 49 |
| Auto erronée | 0 | 0 | 0 |
| Non automatique | 920 | 920 | 951 |
| Suggestions | 134 | 134 | — |
| Rejets | 786 | 786 | — |
| Ambiguïtés | 0 | 0 | — |
| Top-1 correct, indépendamment décision | 941 | 941 | — |

L'absence de champ version dans ce corpus explique que le garde W2 ne change rien ici. La hausse de couverture par rapport à l'égalité n'est donc **pas un gain de ce patch** : c'est la capacité préexistante observée extérieurement.

### Contrôle de l'ordre des candidats, demandé après la première sonde

Le bon candidat était initialement placé premier : le tri stable favorisait artificiellement le top-1 en cas d'égalité. Une seconde exécution conserve exactement requêtes, candidats et seuils, mais ordonne chaque liste selon SHA256(TID-requête + `:` + TID-candidat). **252/1 000 meilleurs scores sont à égalité** ; le top-1 tombe de 941 à **714/1 000**. Le chiffre 941 ne doit donc pas être présenté comme qualité de classement robuste. En revanche les **80 auto-acceptations correctes, 134 suggestions et 786 rejets restent identiques**, de même que les 49 acceptations exactes. Cette correction de protocole ne constitue pas un réglage du moteur. Le script contrôle désormais les 12 en-têtes exacts, TID uniques, CID/TID non vides, colonnes CSV et guillemets clos.

Commande du contrôle : `node scripts/evaluate-external-musicbrainz.mjs /tmp/scout-external-er-0sYL7Q/musicbrainz-20-A01.csv.dapo lib/track-candidate-score.mjs hash` (exit 0).

## Corpus, licence et manifeste

Source primaire : [Database Group Leipzig, benchmark datasets for entity resolution](https://dbs.uni-leipzig.de/research/projects/benchmark-datasets-for-entity-resolution). Attribution : groupe du professeur Erhard Rahm, travaux multi-source ADBIS2017 indiqués sur la page. La page attribue explicitement ces jeux à [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), licence consultée avant téléchargement. [Description des champs](https://dbs.uni-leipzig.de/files/datasets/saeedi/musicBrainz_readme.txt).

- URL : `https://dbs.uni-leipzig.de/files/datasets/saeedi/musicbrainz-20-A01.csv.dapo`
- Fichier isolé : `/tmp/scout-external-er-0sYL7Q/musicbrainz-20-A01.csv.dapo`
- Octets : **2 170 333**, pas d'audio, modèle, compte ni donnée privée.
- SHA256 : `527a94f24f7e813a9bc3fef35a635f13e195516966b308140a0dd2926afbb97d`
- Lecture locale : 19 375 enregistrements, 10 000 clusters CID.
- Données musicales réelles initiales, doublons perturbés artificiellement par **DAPO** selon les auteurs. Les CID sont les labels du fournisseur ; ce n'est pas un jugement humain indépendant des enregistrements audio.
- Données originales non modifiées et non recopiées dans le dépôt. Transformation d'évaluation : artiste/titre uniquement, sans durée ambiguë, catalogue inventé ou source fournisseur privilégiée.

## Protocole gelé et limites

`scripts/evaluate-external-musicbrainz.mjs` : première ligne de chaque CID comme référence ; autres lignes triées par SHA256(TID), 1 000 premières comme requêtes. Pas d'aléatoire, entraînement ni ajustement des seuils. La référence correcte est **injectée** dans chaque liste, complétée de neuf références d'autres CID priorisées par égalité titre puis artiste normalisés, puis TID croissant. Scout reçoit source `unknown`, jamais les CID pour sa décision ; ceux-ci servent seulement à la mesure. Baseline égalité : exige exactement un candidat avec artiste et titre renseignés égaux après normalisation accents/ponctuation.

Il s'agit de résolution conditionnelle à la présence du bon candidat, **pas de retrieval**, ni de clustering complet. Aucun score ne mesure le rappel d'une API distante. Plusieurs requêtes peuvent partager un CID ; il n'y a pas de séparation train/test par CID car aucun entraînement n'a lieu, et aucune indépendance statistique entre toutes les requêtes n'est revendiquée. Le protocole avait commencé avant la demande de splitCID : il a été conservé, sans re-sélection opportuniste après résultat. L'égalité a été ajoutée comme comparateur aux mêmes listes sur instruction du coordinateur, sans modifier la sélection.

Reproduction (depuis la racine du projet) :

```sh
node scripts/evaluate-external-musicbrainz.mjs /tmp/scout-external-er-0sYL7Q/musicbrainz-20-A01.csv.dapo
node scripts/evaluate-external-musicbrainz.mjs /tmp/scout-external-er-0sYL7Q/musicbrainz-20-A01.csv.dapo /tmp/scout-identity-w2-PN8tdk/track-candidate-score.mjs
```

Ces deux exécutions ont terminé exit 0. Le répertoire temporaire peut disparaître : retéléchargement permis avec licence et hash identiques ; la sauvegarde pré-W2 reste temporaire.

## Corpus examiné mais écarté

[YTUnCoverLLM / COLING2025](https://github.com/progsi/YTUnCoverLLM) : licence racine MIT du logiciel lue, mais portée des données tierces pas explicitement établie ; aucun corpus de ce dépôt téléchargé. Surtout, le [papier](https://aclanthology.org/2025.coling-main.658/) mesure détection de mentions Artist/WoA, pas résolution d'enregistrements et versions. Transformer ses annotations NER en vérité catalogue aurait changé la tâche. L'alternative Leipzig a été retenue pour son contrat CID et sa licence données explicite.

Prochaine étape non effectuée : protocole preregistré séparé par CID, avec vraie génération de candidats, candidats absents, confusions de versions et crédits annotés ; mesurer erreurs automatiques **et couverture**, sous-groupes et ressources. Aucun seuil ne doit être promu sur ce seul jeu consulté.
