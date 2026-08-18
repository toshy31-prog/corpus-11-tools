# Laboratoire économique exécutable de la CCT

Ce répertoire compare quatre régimes économiques compatibles avec le noyau CCT
sans supposer qu'un mécanisme unique doit être constitutionnalisé :

1. communs planifiés fédérés ;
2. marché socialisé borné ;
3. planification négociée distribuée ;
4. dotations universelles et quotas.

Le laboratoire exécute 5 760 simulations déterministes et reproductibles : six
scènes × quatre régimes × 240 répétitions. Tous les candidats reçoivent les mêmes
mondes, huit entrées observées et douze paramètres libres. Les seuils et règles
de perte sont dans `scenarios.json`.

L'orchestration des possibilités, les répétitions, les quantiles et les
relations vectorielles sont fournis par le moteur générique
`corpus_labs.run_possibility_space`. CCT conserve uniquement ses régimes,
équations, métriques, seuils, revendications, verdicts et son rapport. Le test de
non-régression exige que les trois artefacts historiques restent identiques
octet par octet.

## Exécuter

Depuis ce répertoire, avec Python 3.10 ou ultérieur et sans dépendance externe :

```bash
python3 -m unittest -v
python3 run_economy.py
```

Le runner crée :

- `results/summary.csv` : médiane et 90e percentile de chaque sortie ;
- `results/verdict.json` : configuration hachée, frontières et conditions de
  perte ;
- `results/report.md` : conclusion lisible, tableaux et garde épistémique.

Pour écrire ailleurs :

```bash
python3 run_economy.py --config scenarios.json --output /tmp/cct-economy
```

## Lire correctement les résultats

Les six résultats sont séparés : besoins vitaux non servis, dépassement
écologique, Gini de ressources, charge, rente et récupération. Il n'existe ni
score, ni moyenne pondérée, ni classement total. Le seul ordre multivarié est la
dominance de Pareto : un candidat domine un autre seulement s'il n'est pire sur
aucune sortie et meilleur sur au moins une.

Le runner signale aussi toute métrique dont la médiane est saturée à zéro pour
tous les candidats. Dans ce cas, l'absence de différence est indéterminée : elle
ne permet pas de conclure que les régimes sont équivalents sur ce phénomène.

`survives_model_internal` signifie uniquement que les équations n'ont pas fait
perdre le candidat sous les règles gelées. `claim_weakened` retire sa
revendication préspécifiée sans rejeter toute l'architecture.
`rejected_model_internal` rejette le candidat dans le domaine synthétique ; ce
n'est pas une preuve contre un régime réel.

## Fichiers

- `REGIMES.md` — constitution matérielle, centres effectifs, risques et
  conditions de perte des quatre candidats ;
- `scenarios.json` — budget d'information apparié, scènes, paramètres,
  métriques, portes et garde épistémique ;
- `economy_model.py` — monde commun, équations et dominance vectorielle ;
- `run_economy.py` — adaptateur CCT vers le moteur Corpus, verdicts, synthèse
  CSV/JSON et rapport ;
- `test_economy.py` — tests d'appariement, déterminisme, bornes, relations et
  non-régression exacte des artefacts.

## Limite active

Le modèle ajoute ses propres fonctions de réponse. Une victoire interne ne peut
donc être attribuée au système économique étudié. Le prochain test réellement
discriminant consiste à faire mesurer les paramètres par des acteurs
indépendants, puis à geler ces mesures avant une réplication sans l'équipe
conceptrice.
