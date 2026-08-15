# Frustration temporelle

## Formulation

**Hypothèse.** Le temps scalaire global peut être une compression d'une structure locale plus riche. La frustration `F_T` est la fraction minimale de relations locales violées par toute affectation scalaire : `F_T = 0` permet un ordre global exact ; `F_T > 0` mesure son défaut d'ajustement.

## Statut

active — définition mathématique candidate ; interprétation physique spéculative.

## Observations favorables

- **Attribution à la source :** la trace fournit la définition variationnelle et l'interprétation des trois régimes.
- **Démonstration élémentaire :** un cycle orienté fini ne peut être plongé dans un ordre strict sans violer au moins une contrainte.
- **Test exhaustif :** deux tournois sur six sommets, appariés sur séquence de scores et nombre de triangles cycliques, ont des frustrations exactes `1/15` et `2/15`.
- **Inférence :** `F_T` sépare l'existence d'un ordre global de la simple présence de relations locales.

## Observations défavorables

- Le choix des relations et des poids peut déjà coder l'ordre ou la frustration.
- Les nombres annoncés pour le jouet à huit triplets sont « à reproduire », faute de graphe complet.
- `F_T` peut n'être qu'un problème classique de satisfaction de contraintes sans portée temporelle.
- Le test exécuté confirme précisément cette borne : l'observable est global, mais reste un nombre minimum standard d'arêtes de retour dans le modèle choisi.

## Hypothèses concurrentes

- Les violations reflètent bruit ou incohérence de données, non structure pré-temporelle.
- Un ordre partiel ou une causalité standard décrit les mêmes observations sans frustration fondamentale.
- Une autre dimension de plongement élimine artificiellement le défaut scalaire.

## Prédictions discriminantes

- Des ensembles ayant les mêmes statistiques locales mais des hypergraphes différents doivent avoir des `F_T` exacts différents.
- Une faible frustration doit prédire quantitativement l'erreur de toute reconstruction scalaire sur des relations retenues hors ajustement.
- Le résultat doit rester invariant sous renommage et sous transformations déclarées équivalentes.

## Condition de renversement

Requalifier comme circulaire si `F_T` n'est faible que lorsque l'ordre cible est injecté dans les contraintes, ou comme simple score descriptif s'il ne prédit aucun cas hors échantillon. Ne pas rejeter avant un résultat discriminant.

## Méthodes nécessaires

Définir relations, poids et classe des coordonnées ; énumération exacte sur hypergraphes finis ; témoins/certificats d'optimalité ; contrôles aléatoires à statistiques locales appariées ; audit de représentation.

## Sources

- `research/sources/Trace_complete_hypothese_temps_recherche.pdf`, sections 9, 11 et 19.
- Corpus 11 Tools : jeu d'audit, pas théorie causale.

## Dernière mise à jour

2026-08-15 — contrôle local/global sur les 32 768 tournois exécuté
