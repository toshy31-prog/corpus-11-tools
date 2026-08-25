# Contrat d’équivalence synthétique

Une donnée synthétique peut être une donnée de recherche suffisante lorsque le
construit visé est entièrement défini par le modèle, la procédure ou la famille
de distributions choisie. Dans ce cas, la routine peut générer, analyser et
conclure sur cette portée.

Elle ne remplace pas une donnée réelle lorsque l’objet dépend de propriétés non
observées du terrain, de comportements, d’institutions, d’un instrument ou
d’une population qui ne sont pas déterminés par le générateur.

## Séquence d'exécution

Cette limite ne rend pas l'IRL immédiatement nécessaire. Tout dossier doit
d'abord épuiser les voies internes appropriées : théorie, calcul, simulation,
mondes fictifs, distributions générées, modèles rivaux et variations de
protocole. L'absence de donnée, de partenaire ou de terrain extérieur appelle
un meilleur substitut interne ; elle ne bloque pas la routine.

Une épreuve IRL n'est examinable qu'une fois toutes les autres voies capables
d'éprouver une faille nommée explicitement écartées. Elle demeure alors une
décision terminale distincte, soumise à une autorisation explicite, et non une
conséquence automatique d'un résultat synthétique.

## Trace minimale de génération

Avec le résultat, la routine doit consigner le construit, la portée de la
conclusion, la définition opérationnelle, le générateur, ses paramètres, ses
invariants, les contrôles exécutés, les effets possibles du protocole et la
condition qui ferait retirer la conclusion. Cette trace accompagne l’exécution
sans la bloquer avant son lancement.

## Statuts de conclusion autorisés

| Statut | Conclusion autorisée | Interdit sans donnée externe |
| --- | --- | --- |
| `formal_exact` | fait démontré dans le système défini | loi sur un système matériel ou social |
| `model_internal` | résultat du modèle, de la simulation ou de la famille déclarée | efficacité causale sur le terrain |
| `pipeline_verified` | entrée, transformation ou calcul vérifié par invariants | représentation fidèle d’un dispositif réel |
| `external_equivalent` | conclusion sur le réel, après calibration et test discriminant indépendants | transport au-delà du domaine calibré |

Un résultat synthétique est donc scientifique lorsqu’il est une observation ou
une démonstration sur un objet correctement spécifié. Il ne devient pas, par la
seule génération, une observation du monde extérieur.
