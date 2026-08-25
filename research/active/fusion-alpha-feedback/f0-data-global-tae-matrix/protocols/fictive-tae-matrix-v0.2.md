# F0-TAE-FICT-002 — correction de l'opérateur orbital fictif

Statut déclaré dans la configuration : **protocole fixé avant exécution** après
l'échec de méthode explicite de `F0-TAE-FICT-001`. Cette chronologie est une
déclaration du protocole, pas un verrou temporel indépendant.

La version 001 déplaçait une probabilité vers la cellule radiale adjacente. Le
déplacement représenté diminuait donc avec le pas de grille et l'interaction
ne convergeait pas. Cette version ne change ni source continue, ni noyaux, ni
rivaux. Elle remplace uniquement l'opérateur par un déplacement fixé en unités
de rayon normalisé, projeté conservativement par interpolation linéaire.

Les trois niveaux de grille, le seuil relatif `0.2`, les trois noyaux, les
contrôles et les verdicts restent ceux de la version 001. La règle de stabilité
porte seulement sur fine→référence; coarse reste diagnostique et n'est pas une
seconde transition exigée. Un résultat non convergent selon cette règle reste
`inconclusive_refinement`; aucun seuil ne sera ajusté après exécution. Une
comparaison canonique exécutable verrouille désormais décision, source, grilles,
noyaux et contrôles entre v1 et v2; seules métadonnées de version et composantes
propres au contrat d'opérateur peuvent différer.

Portées autorisées : `model_internal` pour le drive fictif et
`pipeline_verified` pour provenance, matching, conservation et reconstruction.
