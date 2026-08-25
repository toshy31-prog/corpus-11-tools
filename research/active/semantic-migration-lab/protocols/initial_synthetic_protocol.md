# Cycle synthétique initial — classification de dérives entre deux environnements

## Construit et portée

Le construit est la classification d'une différence de conclusion entre deux
**environnements synthétiques versionnés** recevant les mêmes entrées. Le statut
est `pipeline_verified` : le comparateur vérifie les sorties de règles locales,
non la stabilité de Corpus, d'un modèle, d'un connecteur ou d'un format réel.

## Définition opérationnelle

Les sorties contiennent identifiant de conclusion, portée, attribution et
décision. Une différence est `stable`, `declared_rule_change` lorsqu'elle est
entièrement expliquée par une règle de migration déclarée, ou
`unexplained_drift` dans le cas contraire.

## Générateur, paramètres et invariants

- Générateur : deux fonctions pures `v1` et `v2` plus trois cas synthétiques.
- Paramètres : niveau de preuve, attribution et éventuelle corruption
  explicitement injectée dans le scénario.
- Invariants : mêmes entrées aux deux versions; comparaison de tous les champs
  critiques; règle déclarée nécessaire pour toute différence présentée comme
  justifiée.

## Contrôles et effet de méthode

Un cas stable contrôle l'absence de faux changement; une migration de portée
contrôle l'explication déclarée; une substitution d'attribution contrôle la
dérive non expliquée. Les versions sont des modèles écrits par le même test :
elles ne constituent pas des environnements indépendants ni une régression de
produit.

## Résultat qui retirerait la conclusion

Le résultat est retiré si une différence déclarée est classée stable, si une
différence non déclarée est absoute, ou si les mêmes entrées ne sont plus
utilisées. Une conclusion sur une migration réelle exige deux environnements
versionnés réellement exécutables et un paquet de cas indépendant.
