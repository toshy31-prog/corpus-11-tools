# Cycle synthétique initial — comparaison interlingue de slots sémantiques

## Construit et portée

Le construit est la détection de divergences entre **représentations sémantiques
déclarées** d'une même conclusion synthétique en français, anglais et allemand.
Le statut est `pipeline_verified` : le comparateur vérifie les slots fournis; il
ne mesure pas la qualité d'une traduction, d'un modèle linguistique ou d'une
communauté de locuteurs.

## Définition opérationnelle

Chaque paquet contient une surface dans sa langue et six slots comparables :
identifiant de preuve, identifiant de conclusion, statut de conclusion,
décision, attribution et condition de retrait. Une divergence est un écart de
slot, jamais une simple différence de formulation.

## Générateur, paramètres et invariants

- Générateur : deux triplets synthétiques déterministes dans la fixture.
- Paramètres : trois langues, slots requis et langue de référence française.
- Invariants : les trois paquets d'un cas portent le même identifiant de cas;
  chaque slot requis est présent; une formulation libre ne peut modifier le
  verdict sans modifier un slot déclaré.

## Contrôles et effet de méthode

Le triplet aligné contrôle l'absence de faux positif; le triplet avec dérive de
portée contrôle la détectabilité d'un écart explicite. Le protocole pré-code le
sens des phrases : il peut donc manquer une dérive implicite, idiomatique ou
pragmatique. Il ne permet pas de conclure à la fidélité multilingue générale.

## Résultat qui retirerait la conclusion

Le verdict doit être retiré si le cas aligné est signalé divergent, si la dérive
déclarée n'est pas détectée, ou si une langue manque sans signalement. Une
mesure de fidélité linguistique exigerait un corpus et une évaluation externe
indépendante.
