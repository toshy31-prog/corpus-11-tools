# Exploration préalable — ordre issu de distinctions compatibles

## Statut

Exploration et sélection antérieures à toute exécution scientifique. Aucun résultat du complexe fini historique ni de `F_T` n'a servi à produire ou choisir les candidats. Le protocole primaire doit être verrouillé avant calcul.

## Candidats générés indépendamment

1. **Recollement local** : valuations binaires sur contextes, observable primaire égale au nombre de sections globales compatibles.
2. **Nerf de compatibilité** : complexe des contextes, observables primaires égales aux nombres de Betti exacts.
3. **Ordre d'implication contextuelle** : une distinction `a` implique `b` lorsque tout contexte maximal contenant `a` contient aussi `b`; l'ordre quotient est dérivé après construction du complexe.

Ces candidats ont été produits depuis la seule scène demandée : ensemble fini de distinctions, compatibilités locales, aucune orientation initiale et exigence d'un résultat susceptible d'échouer.

## Audit et sélection

Le recollement teste une obstruction mais ne produit pas d'ordre. Le nerf produit une topologie, pas un ordre entre distinctions. L'implication contextuelle produit un préordre uniquement depuis l'incidence des contextes maximaux et permet un contrôle exhaustif contre des statistiques locales appariées. Le troisième candidat est donc retenu pour adéquation structurelle, avant résultat et sans prétention de supériorité générale.

## Modèle fini complet

- Distinctions : `D = {0,1,2,3,4,5}`.
- Entrées : tous les `2^15 = 32 768` graphes simples étiquetés sur `D`.
- Compatibilité : une partie de `D` est compatible si elle est une clique.
- Contextes complets : cliques maximales non vides, calculées exhaustivement.
- Support contextuel : `S(v)` est l'ensemble des contextes maximaux contenant `v`.
- Préordre dérivé : `u <= v` si `S(u) ⊆ S(v)`.
- Équivalence : `u ~ v` si `S(u) = S(v)`.
- Ordre observable : inclusion stricte entre les classes de supports distincts.

Aucun rang, temps, orientation d'arête, ordre latent, graine génératrice ou résultat cible n'entre dans la définition.

## Observables définies avant calcul

- nombre de graphes dont l'ordre quotient contient au moins une comparaison stricte ;
- histogramme du nombre de comparaisons strictes ordonnées ;
- histogramme de la hauteur exacte de l'ordre quotient ;
- nombre de classes appariées contenant plusieurs signatures d'ordre ;
- premier témoin canonique d'une telle classe, selon l'ordre numérique des masques ;
- écarts d'énumération, de renommage et des contrôles extrêmes.

La classe d'appariement est fixée par : séquence triée des degrés, nombre de triangles et multiensemble des tailles des contextes maximaux. Ces quantités sont calculées sans utiliser l'ordre d'implication.

## Contrôles

- énumération exacte des `32 768` graphes ;
- invariance sous la permutation fixée `(2,5,1,4,0,3)` ;
- graphe vide et graphe complet : aucune comparaison stricte attendue ;
- appariement local exact avant comparaison des signatures d'ordre ;
- témoin canonique choisi uniquement par ordre des masques, jamais par amplitude du signal.

## Conditions de renversement

- aucun graphe ne produit de comparaison stricte : `no_constraint_generated_order` ;
- aucune classe appariée ne sépare les signatures d'ordre : `absorbed_by_matched_summaries` ;
- un contrôle d'énumération, de renommage ou d'extrême échoue : `protocol_or_model_invalid`.

Un résultat non renversé établirait seulement qu'un ordre d'implication peut être dérivé de compatibilités non orientées et n'est pas déterminé par les résumés appariés. Il ne démontrerait ni temps, ni objets, ni émergence physique.

## Arrêt

Après verrouillage du manifeste et de l'empreinte d'exécution, aucune exécution n'est autorisée dans cette étape. Le prochain acte éventuel sera l'exécution unique du protocole déjà figé, sans sélection supplémentaire de complexe.
