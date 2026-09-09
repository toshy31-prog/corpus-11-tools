# Protocole synthétique d’équivalence observationnelle v0.4

## Portée

Cette campagne compare exactement deux modèles causaux binaires internes. Elle teste une seule propriété : deux mécanismes peuvent produire la même distribution de `(X, Y)` tout en prédisant des effets d’intervention différents. Elle ne soutient aucune validité externe.

Le statut d’indépendance est et reste `independence_unknown`. Le fichier tenu à l’écart est produit dans le même environnement de travail ; son isolement procédural ne démontre aucune indépendance externe.

## Ordre obligatoire

1. Écrire la fixture publique, le résultat tenu à l’écart, le test et le présent protocole.
2. Écrire le manifeste pré-exécution.
3. Écrire le sceau après le manifeste, avec les empreintes des entrées.
4. Exécuter `--contract`. Ce mode peut calculer l’empreinte des octets tenus à l’écart, mais ne peut pas les parser.
5. Si et seulement si le contrat passe, exécuter `--execute` une fois. Cette commande crée le reçu avec création exclusive et refuse si le reçu existe déjà.
6. Faire contre-revoir les artefacts et le reçu par une autre IA sans relancer l’exécution.

## Modèles gelés

Les graphes, équations tabulaires, états exogènes et probabilités sont définis une seule fois dans `fixtures/observational_equivalence_models_v0.4.json`. Le test dérive des tables d’équations les distributions observationnelles et les effets sous `do(X=0)` et `do(X=1)` ; les valeurs déclarées ne servent pas de calcul de substitution.

Les deux modèles doivent produire exactement la même distribution observationnelle déclarée. Leurs effets moyens gelés doivent être distincts et de signes différents. Le résultat tenu à l’écart doit donc faire perdre au moins une prédiction si le protocole est discriminant.

## Bornes partielles

Sous binarité et cohérence, sans ignorabilité, le test dérive les bornes de Manski à partir de la distribution commune : bornes de `E[Y(1)]`, de `E[Y(0)]`, puis de l’ATE. Chaque prédiction rivale doit rester dans ces bornes avant ouverture du résultat.

## Limites

La séparation du mode contrat et du mode exécution est locale et vérifiable dans le code. Elle ne rend ni le générateur, ni l’évaluateur, ni le résultat indépendants. Toute conclusion reste limitée à cette paire synthétique.
