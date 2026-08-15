# Frustration temporelle

## Formulation

**Hypothèse.** Le temps scalaire global peut être une compression d'une structure locale plus riche. La frustration `F_T` est la fraction minimale de relations locales violées par toute affectation scalaire : `F_T = 0` permet un ordre global exact ; `F_T > 0` mesure son défaut d'ajustement.

## Statut

active — composante prédictive mathématique renforcée prospectivement dans une famille à ordre latent bruité ; interprétation temporelle et physique toujours spéculative.

## Observations favorables

- **Attribution à la source :** la trace fournit la définition variationnelle et l'interprétation des trois régimes.
- **Démonstration élémentaire :** un cycle orienté fini ne peut être plongé dans un ordre strict sans violer au moins une contrainte.
- **Test exhaustif :** deux tournois sur six sommets, appariés sur séquence de scores et nombre de triangles cycliques, ont des frustrations exactes `1/15` et `2/15`.
- **Portabilité architecturale :** le même contrôle est réobservé par un second module du moteur générique sans modification de `core/` ; 18/18 attentes, dont cinq empreintes SHA-256 du cœur, sont conformes.
- **Audit d'effet de méthode :** un ordre candidat imposé est seulement évalué et ne remplace pas la minimisation ; renommage bijectif des sommets et inversion de toutes les relations préservent le minimum exact.
- **Test prospectif fermé hors ajustement :** sur 192 paires préenregistrées de tournois d'apprentissage/test indépendants conditionnés par le même ordre latent, les ordres minimisant exactement `F_T` réduisent les violations tenues à l'écart de `1941` à `1028` face à un ordre aléatoire indépendant, soit un avantage exact de `913`. Les moyennes augmentent sans inversion aux quatre niveaux de bruit `(0,3,6,9)` ; les contrôles de génération et de représentation ont zéro écart.
- **Inférence :** `F_T` sépare l'existence d'un ordre global de la simple présence de relations locales.
- **Inférence bornée :** dans cette famille seulement, l'optimisation de `F_T` possède un contenu prédictif hors échantillon ; ce résultat n'établit pas que l'ordre latent émerge, puisqu'il est injecté par le générateur.

## Observations défavorables

- Le choix des relations et des poids peut déjà coder l'ordre ou la frustration.
- Les nombres annoncés pour le jouet à huit triplets sont « à reproduire », faute de graphe complet.
- `F_T` peut n'être qu'un problème classique de satisfaction de contraintes sans portée temporelle.
- Le test exécuté confirme précisément cette borne : l'observable est global, mais reste un nombre minimum standard d'arêtes de retour dans le modèle choisi.
- Le passage par un moteur neutre réduit le risque d'un chemin d'exécution spécialisé, mais ne rend ni les relations d'entrée pré-temporelles ni leur interprétation physique indépendantes du modèle.
- Le test prédictif favorable utilise explicitement un ordre latent commun aux jeux d'apprentissage et de test. Il ne discrimine pas encore `F_T` face à d'autres estimateurs standards de cet ordre et ne porte pas sur des relations sans ordre générateur.

## Hypothèses concurrentes

- Les violations reflètent bruit ou incohérence de données, non structure pré-temporelle.
- Un ordre partiel ou une causalité standard décrit les mêmes observations sans frustration fondamentale.
- Une autre dimension de plongement élimine artificiellement le défaut scalaire.

## Prédictions discriminantes

- Des ensembles ayant les mêmes statistiques locales mais des hypergraphes différents doivent avoir des `F_T` exacts différents.
- Une faible frustration doit prédire quantitativement l'erreur de toute reconstruction scalaire sur des relations retenues hors ajustement.
- Dans une famille bruitée à ordre latent fixé avant génération, l'ordre minimisant `F_T` doit battre un ordre indépendant sur des relations nouvelles et son erreur moyenne ne doit pas diminuer quand le bruit injecté augmente. **Prédiction prospectivement satisfaite dans le protocole `temporal-predictive-prospective-001`.**
- Le résultat doit rester invariant sous renommage et sous transformations déclarées équivalentes.

## Condition de renversement

Requalifier comme circulaire si `F_T` n'est faible que lorsque l'ordre cible est injecté dans les contraintes, ou comme simple score descriptif s'il ne prédit aucun cas hors échantillon. Ne pas rejeter avant un résultat discriminant.

## Méthodes nécessaires

Définir relations, poids et classe des coordonnées ; énumération exacte sur hypergraphes finis ; témoins/certificats d'optimalité ; contrôles aléatoires à statistiques locales appariées ; audit de représentation. Conserver l'ordre du journal moteur comme provenance d'exécution, jamais comme donnée de l'observable.

## Sources

- `research/sources/Trace_complete_hypothese_temps_recherche.pdf`, sections 9, 11 et 19.
- Corpus 11 Tools : jeu d'audit, pas théorie causale.

## Dernière mise à jour

2026-08-15 — composante prédictive hors ajustement renforcée par le test prospectif fermé `temporal-predictive-prospective-001`
