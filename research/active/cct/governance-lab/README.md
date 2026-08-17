# Laboratoire de gouvernance CCT-7X-001

Ce laboratoire transforme les sept ruptures conceptuelles de la Confédération des communs terrestres en comparaison synthétique reproductible.

## Ce qui est comparé

- CCT v0.8 ;
- CCT v0.1 ;
- État central planificateur ;
- Fédération sociale de marché.

Les quatre architectures reçoivent le même nombre de traits, les mêmes scénarios, le même bruit et les mêmes métriques. Les profils ne sont pas des mesures empiriques : ce sont des hypothèses visibles et modifiables dans `experiment.json`.

## Exécution

```bash
cd research/active/cct/governance-lab
python3 -m unittest -v
python3 run_experiment.py --config experiment.json --output results-001
python3 run_experiment.py --config experiment_v2.json --output results-002
python3 run_p001.py
python3 run_p001.py --config p001_config_v2.json --output results-p001-v2
python3 run_p001.py --config p001_config_v3.json --output results-p001-v3
python3 run_p002.py
python3 run_p002.py --config p002_config_v2.json --output results-p002-v2
python3 run_limit_tests.py
python3 run_p005.py
python3 run_p005.py --config p005_config_v2.json --output results-p005-v2
```

Les sorties sont écrites dans le dossier `results-*` correspondant à chaque protocole :

- `summary.csv` : intervalles et taux de passage pour les 112 cellules ;
- `verdict.json` : application mécanique de la condition de perte ;
- `report.md` : lecture synthétique.

## Garde épistémique

Le simulateur ne découvre pas le monde : il calcule les conséquences de mécanismes et de paramètres déclarés. Son meilleur usage est de révéler les hypothèses qui font gagner ou perdre une architecture, de chercher des incohérences et de définir les observations nécessaires à une calibration indépendante.

Un bon résultat signifie « non réfuté par cette famille d’équations », jamais « système politiquement validé ».

`CCT-L50-001` ajoute cinquante tests-limites conceptuels répartis en dix familles. Il ne calcule pas des effets sociaux : il vérifie que chaque scène possède un centre probable, un observable, un seuil d’échec, un verdict borné et une correction. Sa sortie complète se trouve dans `results-limit-50/`.

`P005-DT-001` confronte CCT v0.11, CCT v0.10 et une urgence centralisée simple à des ressources dégradées communes. Cinq résultats constitutionnels restent séparés et non compensables. `P005-DT-002` ajoute deux scènes discriminantes et une candidate frugale qui cherche une baisse de charge sans perte des cinq noyaux.

## Versions du protocole

- `CCT-7X-001` est le premier protocole. Son pilote a révélé un effet plafond : le profil CCT recevait une moyenne de capacités nettement supérieure aux rivaux.
- `CCT-7X-002` est une nouvelle version, déclarée après cet échec. Elle rapproche les budgets de capacités et relève les planchers. Elle ne réécrit pas rétrospectivement 001.

`P001-DT-001` approfondit ensuite la faiblesse la plus discriminante : la continuité d’un service vital pendant une transition sabotée. Son jumeau numérique compare trois gouvernances à budget égal et conserve séparément continuité, vitesse, droits, concentration et restitution des pouvoirs.

- `P001-DT-001` a rejeté la porte pure ; l'audit a aussi découvert que les rivaux ne recevaient pas les mêmes tirages exogènes. La graine est désormais commune par protocole et répétition.
- `P001-DT-002` a ajouté une cellule de continuité bornée. Son rejet à 19,8 % contre un seuil de 20 % a révélé une substitution de proxy : la marge conventionnelle remplaçait le compromis de continuité revendiqué.
- `P001-DT-003` conserve les mécanismes de 002 mais préspécifie une non-infériorité de 5 % face au meilleur rival, une amélioration minimale de 10 % face au calendrier, et des gains séparés sur droits et restitution. L'hybride survit trois protocoles sur quatre et perd sous attaque ciblée de la porte.

- `P002-DT-001` compare corridor, plan annuel et marché écologique à chocs communs. Son pilote a révélé un comptage erroné de capacité inutilisée comme empreinte ; la mesure corrigée ne compte que les unités effectivement allouées.
- `P002-DT-002` ajoute fraude de catégorie et apprentissage adversarial. Le corridor survit les six protocoles mais sa charge administrative est 69 % supérieure à celle du plan ; sous fraude adaptative, son avantage vital face au plan se réduit à 2,3 points. Cette tension motive le corridor à deux régimes de la v0.10, encore non testé territorialement.
